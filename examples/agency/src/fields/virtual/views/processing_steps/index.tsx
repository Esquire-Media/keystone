/** @jsxRuntime classic */
/** @jsx jsx */

import { Button } from '@keystone-ui/button'
import { Stack, jsx } from '@keystone-ui/core';
import { DrawerController } from '@keystone-ui/modals'
import { FieldProps } from '@keystone-6/core/types';
import { FieldContainer, FieldDescription, FieldLabel } from '@keystone-ui/fields';
import { controller } from '@keystone-6/core/fields/types/virtual/views';
import { AutocompleteSelect, OrderableList, type Item } from '../../../../primatives'
import { Fragment, useState } from 'react';
import { useList } from '@keystone-6/core/admin-ui/context';
import { CreateItemDrawer } from '@keystone-6/core/admin-ui/components';

export const Field = (props: FieldProps<typeof controller>) => {
  // Get metadata properties using a custom hook
  const metaProps = {
    foreignListKey: "TargetingProcessingStep", // The foreign list linked to this field
    foreignLabelPath: "id", // The foreign list linked to this field
    hideCreate: false,
  };
  const foreignList = useList(metaProps.foreignListKey)
  // const localList = useList(field.listKey)

  // Initialize state with the provided value, defaulting to an empty array
  const value = typeof props.value === 'object' ? props.value : [];
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  function onCreate(value: any) {
    console.log(value)
  }

  return (
    <FieldContainer>
      <FieldLabel>{props.field.label}</FieldLabel>
      <FieldDescription id={`${props.field.path}-description`}>
        {props.field.description}
      </FieldDescription>
      <Fragment>
        <Stack gap="medium">
          {(props.onChange && metaProps.foreignListKey && metaProps.foreignLabelPath) ? (
            <ComponentWrapper
              foreignListKey={metaProps.foreignListKey}
              foreignLabelPath={metaProps.foreignLabelPath}
              onChange={props.onChange}
              value={value}
            />
          ) : null}

          <Stack across gap="small">
            {props.onChange !== undefined && !metaProps.hideCreate && (
              <Button
                size="small"
                disabled={isDrawerOpen}
                onClick={() => {
                  setIsDrawerOpen(true)
                }}
              >
                Create related {foreignList.singular}
              </Button>
            )}
          </Stack>
        </Stack>
        {props.onChange !== undefined && (
          <DrawerController isOpen={isDrawerOpen}>
            <CreateItemDrawer
              listKey={foreignList.key}
              onClose={() => {
                setIsDrawerOpen(false)
              }}
              onCreate={val => {
                setIsDrawerOpen(false)
                onCreate({
                  ...value,
                  value: val,
                })
              }}
            />
          </DrawerController>
        )}
      </Fragment>
    </FieldContainer >
  );
};

function ComponentWrapper(props: {
  foreignListKey: string;
  foreignLabelPath: string;
  value: any[];
  onChange: (values: any) => void;
}) {
  // Formatting the value to be typeof Item[]
  const value: Item[] = props.value.map((v) => ({ label: v[props.foreignLabelPath], value: v.id }))

  /* Handlers */
  // Adds items only if they do not already share a label
  const addItem = (item: Item) => {
    if (value.filter((v) => v.label === item.label).length === 0) {
      onChange([...value, item])
    }
  }
  // Handles both the item state and the onChange
  const onChange = (items: Item[]) => {
    props.onChange(items.map(i => ({ [props.foreignLabelPath]: i.label, id: i.value })))
  }

  return (
    <div>
      <AutocompleteSelect
        listKey={props.foreignListKey}
        fieldPath={props.foreignLabelPath}
        onChange={addItem}
        ignoreValues={value.map((v) => v.label)}
      />
      <OrderableList
        items={value.map(i => ({ ...i, key: i.label }))}
        onChange={onChange}
      />
    </div>
  )
}