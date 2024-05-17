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

export const Field = (props: FieldProps<typeof controller>) => {
  // Get metadata properties using a custom hook
  const metaProps = {
    foreignListKey: "TargetingProcessingStep", // The foreign list linked to this field
    foreignLabelPath: "id", // The foreign list linked to this field
  };
  // const localList = useList(field.listKey)

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
  // Formatting the value to be typeof Item[]
  const value: Item[] = props.value.map((v) => ({ label: v[props.foreignLabelPath], value: v.id }))
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const foreignList = useList(props.foreignListKey)

  /* Handlers */
  // Handles both the item state and the onChange
  const onChange = (items: Item[]) => {
    props.onChange(items.map(i => ({ [props.foreignLabelPath]: i.label, id: i.value })))
  }

  return (
    <div>
      <OrderableList
        items={value.map(i => ({ ...i, key: i.label }))}
        onChange={onChange}
      />

      <Stack across gap="small">
        {props.onChange !== undefined && (
          <Button
            size="small"
            disabled={isDrawerOpen}
            onClick={() => {
              setIsDrawerOpen(true)
            }}
          >
            Create related {foreignList.label}
          </Button>
        )}
      </Stack>
      {props.onChange !== undefined && (
        <DrawerController isOpen={isDrawerOpen}>
          <CreateItemDrawer
            listKey={props.foreignListKey}
            onClose={() => {
              setIsDrawerOpen(false)
            }}
            onCreate={val => {
              setIsDrawerOpen(false)
              onChange([...value, { label: val.label, value: val.id }])
            }}
          />
        </DrawerController>
      )}
    </div>
  )
}