/** @jsxRuntime classic */
/** @jsx jsx */

import { jsx, Box } from '@keystone-ui/core'
import { Drawer } from '@keystone-ui/modals'
import { LoadingDots } from '@keystone-ui/loading'

import { useKeystone, useList } from '@keystone-6/core/admin-ui/context'

import { Fields, deserializeValue, makeDataGetter } from '@keystone-6/core/admin-ui/utils'
import { GraphQLErrorNotice } from '@keystone-6/core/admin-ui/components'
import { gql, useQuery } from '@keystone-6/core/admin-ui/apollo'
import React, { useEffect, useMemo, useState } from 'react'

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
  const { createViewFieldModes } = useKeystone()
  const list = useList(listKey)
  const itemState = useQuery(
    gql`query($id: ID!) {
      item: ${list.gqlNames.itemQueryName}(where: {id: $id}) {
        ${Object.keys(list.fields)}
      }
    }`,
    { variables: { id }, errorPolicy: 'all', skip: id === null }
  )
  const [value, setValue] = useState(() => {
    const value: ValueWithoutServerSideErrors = {}
    Object.keys(list.fields).forEach(fieldPath => {
      value[fieldPath] = { kind: 'value', value: list.fields[fieldPath].controller.defaultValue }
    })
    return value
  })
  useEffect(() => {
    if (!itemState.loading && !itemState.error && itemState.data && itemState.data.item) {
      const val: ValueWithoutServerSideErrors = {}
      // itemState.data has one field called "item", use this and not just the "data"
      const dataGetter = makeDataGetter(itemState.data.item, undefined)
      const fieldValues = deserializeValue(list.fields, dataGetter)
      // fieldValues is already formatted properly, no need to add { kind: 'value', ... }
      Object.entries(fieldValues).forEach(([fv, fp]) => {
        fp.kind === "value" ? val[fv] = fp : undefined
      })
      setValue(val)
    }
  }, [itemState])
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
  const [forceValidation, setForceValidation] = useState(false)

  return (
    <Drawer
      title={`Edit ${list.singular} > ${id}`}
      width="wide"
      actions={{
        confirm: {
          label: `Save`,
          loading: itemState.loading,
          action: async () => {
            onSave(id)
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
          onChange={console.log}
        />
      </Box>
    </Drawer>
  )
}
