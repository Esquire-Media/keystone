import {
  type BaseListTypeInfo,
  fieldType,
  type FieldTypeFunc,
  type CommonFieldConfig,
  orderDirectionEnum,
  JSONValue,
} from '@keystone-6/core/types';
import { graphql } from '@keystone-6/core';
import { filters } from '@keystone-6/core/fields';
import { getNamedType } from "graphql";
import merge from "lodash.merge";
import { BasicConfig, type Config, Utils } from '@react-awesome-query-builder/ui';
import { AntdConfig } from "@react-awesome-query-builder/antd";

export type FilterDepenancy = {
  list?: string; // The specific list the dependency is part of.
  field?: string; // The specific field within the list that forms the dependency.
};
type FilterConfig = {
  isIndexed?: boolean | "unique";
  ui?: {
    style?: "default" | "antd";
  };
  fields?: JSONValue | null;
  dependency?: FilterDepenancy | null;
};
export type FilterFieldConfig<ListTypeInfo extends BaseListTypeInfo> =
  CommonFieldConfig<ListTypeInfo> & FilterConfig;
export type FilterViewConfig = {
  style: "default" | "antd";
  fields: JSONValue | null;
  dependency: FilterDepenancy | null;
};

export function queryBuilder<ListTypeInfo extends BaseListTypeInfo>({
  isIndexed,
  ...config
}: FilterFieldConfig<ListTypeInfo>): FieldTypeFunc<ListTypeInfo> {
  const mode = isIndexed === "unique" ? "required" : "optional";
  let defaultConfig: Config = BasicConfig
  switch (config.ui?.style) {
    case 'antd': defaultConfig = AntdConfig
  }
  return (meta) =>
    fieldType({
      kind: "scalar",
      mode: "optional",
      scalar: "String",
      index: isIndexed === true ? "index" : isIndexed || undefined,
    })({
      ...config,
      input: {
        uniqueWhere:
          isIndexed === "unique"
            ? { arg: graphql.arg({ type: graphql.String }) }
            : undefined,
        where: {
          arg: graphql.arg({
            type: filters[meta.provider].String[mode],
          }),
          resolve: mode === "required" ? undefined : filters.resolveString,
        },
        create: {
          arg: graphql.arg({ type: graphql.String }),
          resolve(value) {
            return value;
          },
        },
        update: { arg: graphql.arg({ type: graphql.String }) },
        orderBy: { arg: graphql.arg({ type: orderDirectionEnum }) },
      },
      output: graphql.field({
        type: graphql.String,
        args: {
          format: graphql.arg({
            type: graphql.String,
            defaultValue: 'json',
          }),
        },
        resolve: async (source, args, context, info) => {
          if (args?.format) {
            let fields: {} = typeof config.fields === "object" ? { ...config.fields } : {}
            if (config.dependency) {
              const sudo = context.sudo()
              if (config.dependency.field) {
                const keys = config.dependency.field.split(".")
                fields = JSON.parse(selectNestedKey(keys, await sudo.query[meta.listKey].findOne({
                  where: { id: source.item.id.toString() },
                  query: createNestedString(keys)
                })))
              } else if (config.dependency.list) {
                
              }
            }
            const mergedConfig: Config = {
              ...defaultConfig,
              fields: fields
            }
            const jsonLogic = Utils.loadFromJsonLogic(JSON.parse(source.value ?? ""), mergedConfig);
            if (jsonLogic) {
              switch (args.format) {
                case 'mongodb':
                  return JSON.stringify(Utils.Export.mongodbFormat(jsonLogic, mergedConfig));
                case 'sql':
                  return JSON.stringify(Utils.Export.sqlFormat(jsonLogic, mergedConfig));
                case 'spel':
                  return JSON.stringify(Utils.Export.spelFormat(jsonLogic, mergedConfig));
                case 'elasticsearch':
                  return JSON.stringify(Utils.Export.elasticSearchFormat(jsonLogic, mergedConfig));
                // Add more cases for custom formats as needed
                default:
                  return source.value;
              }
            }
          } else {
            return source.value
          }
        },
      }),
      views: "@keystone-6/fields-query-builder/views",
      getAdminMeta() {
        const fields = config.fields || {};
        if (config.dependency?.field) {
          // Handle field-specific dependencies.
          const field = config.dependency.field.split(".")[0];
          if (!config.dependency?.list) {
            // Determine the list of the dependency if not explicitly set.
            config.dependency.list = getNamedType(
              meta.lists[meta.listKey].types.output.graphQLType.getFields()[
                field
              ].type,
            ).name;
          }
        }
        return {
          style: config.ui?.style || null,
          fields: fields || null,
          dependency: config.dependency || null,
        };
      },
    });
}


function createNestedString(fields: string[]): string {
  let nestedString = "";
  for (let i = fields.length - 1; i >= 0; i--) {
    if (i === fields.length - 1) {
      // First iteration (actually the last element of the array)
      nestedString = fields[i];
    } else {
      // Wrap the current field around the nestedString
      nestedString = `${fields[i]} { ${nestedString} }`;
    }
  }
  return nestedString;
}
function selectNestedKey(path: string[], obj: any): any {
  let result = obj;
  for (const key of path) {
    if (result[key] === undefined) {
      return undefined;
    }
    result = result[key];
  }
  return result;
}
