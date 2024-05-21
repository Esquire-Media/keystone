/** @jsxRuntime classic */
/** @jsx jsx */

import { jsx, Box } from '@keystone-ui/core'
import { LoadingDots } from '@keystone-ui/loading'
import { Drawer } from '@keystone-ui/modals'
import { useToasts } from '@keystone-ui/toast'
import { gql, useMutation, useQuery } from '@keystone-6/core/admin-ui/apollo'
import { GraphQLErrorNotice } from '@keystone-6/core/admin-ui/components'
import { useKeystone, useList } from '@keystone-6/core/admin-ui/context'
import { Fields, Value, deserializeValue, makeDataGetter } from '@keystone-6/core/admin-ui/utils'
import { useCallback, useEffect, useMemo, useState } from 'react'
import isDeepEqual from 'fast-deep-equal'

type ValueWithoutServerSideErrors = { [key: string]: { kind: 'value', value: any } }

export function ItemDrawer({
  listKey,
  id,
  onClose,
  onSave,
}: {
  listKey: string
  id: string
  onClose: () => void
  onSave: (id: string) => void
}) {
  /* Consts/States */
  const toasts = useToasts()
  const list = useList(listKey)
  const { createViewFieldModes } = useKeystone()
  const [forceValidation, setForceValidation] = useState(false)

  // Formatted value used by keystone-6 utils "Fields"
  const [value, setValue] = useState<ValueWithoutServerSideErrors>(() => {
    const value: ValueWithoutServerSideErrors = {}
    Object.keys(list.fields).forEach(fieldPath => {
      value[fieldPath] = {
        kind: 'value',
        value: list.fields[fieldPath].controller.defaultValue
      }
    })
    return value
  })

  // Used for validating field values - in "onUpdate"
  const invalidFields = useMemo(() => {
    const invalidFields = new Set<string>()
    Object.keys(value).forEach(fieldPath => {
      let val = value[fieldPath].value

      const validateFn = list.fields[fieldPath].controller.validate
      if (validateFn) {
        const result = validateFn(val)
        if (result === false) {
          invalidFields.add(fieldPath)
        }
      }
    })
    return invalidFields
  }, [list, value])

  // Acquire and format the updated Field values
  const updateData: Record<string, any> = {}
  Object.keys(list.fields).forEach(fieldPath => {
    const { controller } = list.fields[fieldPath]
    const serialized = controller.serialize(value[fieldPath].value)
    // Checking to see if a change has actually occurred
    if (!isDeepEqual(serialized, controller.serialize(controller.defaultValue))) {
      Object.assign(updateData, serialized)
    }
  })

  /* Queries */
  // Query to get all the current values of the item
  const itemState = useQuery(
    gql`query($id: ID!) {
      item: ${list.gqlNames.itemQueryName}(where: {id: $id}) {
        ${Object.keys(list.fields)}
      }
    }`,
    { variables: { id }, errorPolicy: 'all', skip: id === null }
  )
  // Handles "itemState" query result, formats and sets "value" state
  useEffect(() => {
    if (!itemState.loading && !itemState.error && itemState.data?.item) {
      const val: ValueWithoutServerSideErrors = {}
      const dataGetter = makeDataGetter(itemState.data.item, undefined)
      const fieldValues = deserializeValue(list.fields, dataGetter)
      Object.entries(fieldValues).forEach(([fv, fp]) => {
        fp.kind === "value" ? val[fv] = fp : undefined
      })
      setValue(val)
    }
  }, [itemState])

  // Mutation to update them item when the user clicks "Save" - takes "updateData"
  const [updateItem] = useMutation(
    gql`
      mutation(
        $where: ${list.gqlNames.whereUniqueInputName}!,
        $data: ${list.gqlNames.updateInputName}!
        ) {
          ${list.gqlNames.updateMutationName} (
            where: $where,
            data: $data
          ) {
            ${Object.keys(list.fields)}
          }
        }
    `,
    {
      variables: {
        where: {
          id: id
        },
        data: updateData
      }
    }
  )

  /* Handlers */
  // This fn is passed to the onChange of "Fields", which passes 1 arg:  an anonymous function
  // That fn passes 1 arg - a "Value" - and returns a "Value"
  // This is used to properly update the state
  const onChange = useCallback(
    (getNewValue: (value: Value) => Value) => {
      setValue(oldValues => getNewValue(oldValues) as ValueWithoutServerSideErrors)
    },
    []
  );

  // This fn is passed to the "confirm" action of the "Drawer"
  const onUpdate = async () => {
    // Validation check
    const newForceValidation = invalidFields.size !== 0
    setForceValidation(newForceValidation)
    if (newForceValidation) return undefined

    // Call update
    let outputData;
    try {
      outputData = await updateItem()
    } catch {
      return undefined
    }

    // Handle success - notification + return value
    toasts.addToast({
      title: id,
      message: "Updated Successfully",
      tone: "positive"
    })
    return outputData
  }

  return (
    <Drawer
      title={`Edit ${list.singular} > ${id}`}
      width="wide"
      actions={{
        confirm: {
          label: `Save`,
          loading: itemState.loading,
          action: async () => {
            let outputData = await onUpdate()
            onSave(id)
            return outputData
          },
        },
        cancel: {
          label: 'Cancel',
          action: () => {
            onClose()
          },
        },
      }}
    >
      {createViewFieldModes.state === 'error' && (
        <GraphQLErrorNotice
          networkError={
            createViewFieldModes.error instanceof Error ? createViewFieldModes.error : undefined
          }
          errors={
            createViewFieldModes.error instanceof Error ? undefined : createViewFieldModes.error
          }
        />
      )}
      {createViewFieldModes.state === 'loading' && <LoadingDots label="Loading..." />}
      {itemState.error && (
        <GraphQLErrorNotice
          networkError={itemState.error?.networkError}
          errors={itemState.error?.graphQLErrors}
        />
      )}
      <Box paddingY="xlarge">
        <Fields
          fields={list.fields}
          groups={list.groups}
          fieldModes={createViewFieldModes.state === 'loaded' ? createViewFieldModes.lists[list.key] : null}
          forceValidation={forceValidation}
          invalidFields={invalidFields}
          value={value}
          onChange={onChange}
        />
      </Box>
    </Drawer>
  )
}
