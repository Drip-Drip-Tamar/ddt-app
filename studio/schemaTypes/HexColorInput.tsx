import React, {type ChangeEvent} from 'react'
import {set, unset, type StringInputProps} from 'sanity'
import {NEWS_IMAGE_BACKGROUND_COLOR_VALIDATION_REGEX} from './newsImageSizing'

const FALLBACK_COLOR_VALUE = '#e5e7eb'

function toColorInputValue(value: unknown): string {
  if (typeof value !== 'string' || !NEWS_IMAGE_BACKGROUND_COLOR_VALIDATION_REGEX.test(value)) {
    return FALLBACK_COLOR_VALUE
  }

  if (value.length === 4) {
    return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`
  }

  return value
}

export function HexColorInput(props: StringInputProps) {
  const {elementProps, onChange, value} = props
  const {style, ...textInputProps} = elementProps
  const textValue = typeof value === 'string' ? value : ''
  const colorValue = toColorInputValue(value)

  const handleColorChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(set(event.currentTarget.value))
  }

  const handleTextChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.currentTarget.value.trim()
    onChange(nextValue ? set(nextValue) : unset())
  }

  return (
    <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
      <input
        aria-label="Pick background colour"
        disabled={elementProps.readOnly}
        type="color"
        value={colorValue}
        onChange={handleColorChange}
        style={{
          width: '3rem',
          height: '2.5rem',
          padding: 0,
          border: '1px solid #cad1dc',
          borderRadius: '4px',
          background: 'transparent',
        }}
      />
      <input
        {...textInputProps}
        type="text"
        value={textValue}
        placeholder="#000000"
        onChange={handleTextChange}
        style={{...style, flex: 1}}
      />
    </div>
  )
}
