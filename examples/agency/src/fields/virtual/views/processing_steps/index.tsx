/** @jsxRuntime classic */
/** @jsx jsx */

import { Button } from '@keystone-ui/button'
import { Stack, jsx } from '@keystone-ui/core';
import { DrawerController } from '@keystone-ui/modals'
import { FieldProps } from '@keystone-6/core/types';
import { FieldContainer, FieldDescription, FieldLabel } from '@keystone-ui/fields';
import { controller } from '@keystone-6/core/fields/types/virtual/views';
import { OrderableList, type Item } from '../../../../primatives'
import { Fragment, useState } from 'react';
import { useList } from '@keystone-6/core/admin-ui/context';
import { CreateItemDrawer } from '@keystone-6/core/admin-ui/components';
import { ItemDrawer } from './components/ItemDrawer';
import { gql, useQuery } from '@keystone-6/core/admin-ui/apollo';

export const Field = (props: FieldProps<typeof controller>) => {
  // Get metadata properties using a custom hook
  const metaProps = {
    foreignListKey: "TargetingProcessingStep", // The foreign list linked to this field
    foreignLabelPath: "outputType", // The foreign list linked to this field
  };

  // Initialize state with the provided value, defaulting to an empty array
  const value = typeof props.value === 'object' ? props.value : [];

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
        </Stack>
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
  const foreignList = useList(props.foreignListKey)
  const labels = foreignList.fields[props.foreignLabelPath].fieldMeta["options"]
  const value: Item[] = props.value.map((v) => ({ label: labels.find((option: any) => option.value === v[props.foreignLabelPath]).label, value: v.id }))
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false)
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState<string | undefined>()

  // After onCreate, this gets the object needed for display in "OrderableList"
  const newForeignItemQuery = useQuery(
    gql`query($where: ${foreignList.gqlNames.whereUniqueInputName}!) {
      ${foreignList.gqlNames.itemQueryName}(where: $where) {
        ${props.foreignLabelPath}
        id
      }
    }`,
    {
      // "variables" must be present but empty
      // This value is via args of ".refetch()"
      variables: {}
    }
  )
  const onCreate = async (item: Item) => {
    const res = await newForeignItemQuery.refetch({
      where: {
        id: item.value
      }
    })
    props.onChange([...props.value, res.data[foreignList.gqlNames.itemQueryName]])
  }

  // Item[] is used for display purposes
  // This converts it to the correct type for the Field's onChange
  const onChange = (items: Item[]) => {
    props.onChange(items.map(i => ({ [props.foreignLabelPath]: labels.find((option: any) => option.label === i.label).value, id: i.value })))
  }
  const onClick = (item: Item) => {
    setIsEditDrawerOpen(item.value)
  }

  return (
    <div>
      <OrderableList
        items={value.map(i => ({ ...i, key: i.value }))}
        onChange={onChange}
        onClick={onClick}
      />

      <Stack across gap="small">
        {props.onChange !== undefined && (
          <Button
            size="small"
            disabled={isCreateDrawerOpen}
            onClick={() => {
              setIsCreateDrawerOpen(true)
            }}
          >
            Create related {foreignList.label}
          </Button>
        )}
      </Stack>
      {props.onChange !== undefined && (
        <DrawerController isOpen={isCreateDrawerOpen} key={"create"}>
          <CreateItemDrawer
            listKey={props.foreignListKey}
            onClose={() => {
              setIsCreateDrawerOpen(false)
            }}
            onCreate={val => {
              setIsCreateDrawerOpen(false)
              onCreate({ label: val.label, value: val.id })
            }}
          />
        </DrawerController>
      )}
      {props.onChange !== undefined && (
        <DrawerController isOpen={Boolean(isEditDrawerOpen)} key={isEditDrawerOpen || ""}>
          <ItemDrawer
            listKey={props.foreignListKey}
            id={isEditDrawerOpen || ""}
            onClose={() => {
              setIsEditDrawerOpen(undefined)
            }}
            onSave={console.log}
          />
        </DrawerController>
      )}
    </div>
  )
}