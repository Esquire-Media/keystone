/** @jsxRuntime classic */
/** @jsx jsx */

import { jsx } from '@keystone-ui/core'
import { FieldProps } from '@keystone-6/core/types'
import { FieldContainer, FieldDescription, FieldLabel } from '@keystone-ui/fields'
import { controller } from '@keystone-6/core/fields/types/relationship/views'
import useFieldProps from './useFieldProps'

export const Field = ({ field, value, itemValue, onChange, autoFocus }: FieldProps<typeof controller>) => {
  const { props } = useFieldProps(field.listKey, field.path)
  console.log(props)
  return (
    <FieldContainer>
      <FieldLabel>{field.label}</FieldLabel>
      <FieldDescription id={`${field.path}-description`}>{field.description}</FieldDescription>
      <div>{JSON.stringify(props)}</div>
    </FieldContainer>
  )
}