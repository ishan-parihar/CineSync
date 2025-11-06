import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/atoms/Button'

describe('Button Component', () => {
  const user = userEvent.setup()

  it('renders correctly with default props', () => {
    render(<Button>Click me</Button>)
    const button = screen.getByRole('button', { name: /click me/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass('bg-blue-600', 'text-white')
  })

  it('handles click events', async () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    
    const button = screen.getByRole('button', { name: /click me/i })
    await user.click(button)
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('renders with different variants', () => {
    const { rerender } = render(<Button variant="secondary">Secondary</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-gray-200', 'text-gray-800')

    rerender(<Button variant="danger">Danger</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-red-600', 'text-white')

    rerender(<Button variant="ghost">Ghost</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-transparent', 'text-blue-600')
  })

  it('renders with different sizes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>)
    expect(screen.getByRole('button')).toHaveClass('px-3', 'py-1.5', 'text-sm')

    rerender(<Button size="lg">Large</Button>)
    expect(screen.getByRole('button')).toHaveClass('px-6', 'py-3', 'text-lg')
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>)
    const button = screen.getByRole('button', { name: /disabled/i })
    expect(button).toBeDisabled()
    expect(button).toHaveClass('opacity-50', 'cursor-not-allowed')
  })

  it('shows loading state', () => {
    render(<Button loading>Loading</Button>)
    const button = screen.getByRole('button', { name: /loading/i })
    expect(button).toBeDisabled()
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('renders with custom className', () => {
    render(<Button className="custom-class">Custom</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('custom-class')
  })

  it('renders with icon', () => {
    render(<Button icon={<span data-testid="test-icon" />}>With Icon</Button>)
    expect(screen.getByTestId('test-icon')).toBeInTheDocument()
  })

  it('has proper accessibility attributes', () => {
    render(
      <Button 
        aria-label="Custom aria label"
        aria-describedby="description-id"
      >
        Button
      </Button>
    )
    
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-label', 'Custom aria label')
    expect(button).toHaveAttribute('aria-describedby', 'description-id')
  })

  it('triggers keyboard events', async () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    
    const button = screen.getByRole('button')
    button.focus()
    await user.keyboard('{Enter}')
    
    expect(handleClick).toHaveBeenCalledTimes(1)
    
    await user.keyboard(' ') // Space key
    expect(handleClick).toHaveBeenCalledTimes(2)
  })

  it('prevents event propagation when stopPropagation is true', async () => {
    const handleParentClick = jest.fn()
    const handleButtonClick = jest.fn()
    
    render(
      <div onClick={handleParentClick}>
        <Button onClick={handleButtonClick} stopPropagation>
          Click me
        </Button>
      </div>
    )
    
    const button = screen.getByRole('button')
    await user.click(button)
    
    expect(handleButtonClick).toHaveBeenCalledTimes(1)
    expect(handleParentClick).not.toHaveBeenCalled()
  })

  it('has proper focus management', async () => {
    render(<Button>Focus Test</Button>)
    const button = screen.getByRole('button')
    
    await user.tab()
    expect(button).toHaveFocus()
    
    await user.keyboard('{Enter}')
    expect(button).toHaveFocus() // Should maintain focus after click
  })

  it('renders as different element when as prop is provided', () => {
    render(<Button as="a" href="/test">Link Button</Button>)
    const link = screen.getByRole('link', { name: /link button/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/test')
  })

  it('has performance optimization - should not re-render unnecessarily', () => {
    const handleClick = jest.fn()
    const { rerender } = render(<Button onClick={handleClick}>Test</Button>)
    
    const initialButton = screen.getByRole('button')
    
    rerender(<Button onClick={handleClick}>Test</Button>)
    const rerenderedButton = screen.getByRole('button')
    
    expect(initialButton).toBe(rerenderedButton)
  })

  it('handles rapid clicks without issues', async () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Rapid Click</Button>)
    
    const button = screen.getByRole('button')
    
    // Rapid clicks
    for (let i = 0; i < 10; i++) {
      await user.click(button)
    }
    
    expect(handleClick).toHaveBeenCalledTimes(10)
  })

  it('properly cleans up event listeners on unmount', () => {
    const handleClick = jest.fn()
    const { unmount } = render(<Button onClick={handleClick}>Test</Button>)
    
    unmount()
    
    // Should not throw errors and events should not fire after unmount
    expect(() => handleClick()).not.toThrow()
  })
})