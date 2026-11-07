import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Field, FormError } from './Field'

describe('FR-058 form fields', () => {
  it('links the error to the input and marks it invalid', () => {
    render(<Field id="email" label="Email" error="Enter a valid email address." />)
    const input = screen.getByLabelText('Email')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Enter a valid email address.')
  })

  it('shows the hint when there is no error', () => {
    render(<Field id="pw" label="Password" hint="At least 8 characters." />)
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('At least 8 characters.')
    expect(screen.getByLabelText('Password')).not.toHaveAttribute('aria-invalid')
  })

  it('announces form errors', () => {
    render(<FormError>Email or password is incorrect.</FormError>)
    expect(screen.getByRole('alert')).toHaveTextContent('incorrect')
  })
})
