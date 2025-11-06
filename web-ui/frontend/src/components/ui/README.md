# Component Library Documentation

## Overview

This is a comprehensive component library and design system for the LipSync Automation frontend. It follows atomic design principles and provides a consistent, accessible, and maintainable set of UI components.

## Design System

### Design Tokens

Design tokens are defined in `src/styles/tokens.css` and include:
- Colors (primary, secondary, semantic, neutral)
- Typography (font families, sizes, weights, line heights)
- Spacing (consistent spacing scale)
- Border radius, shadows, animations
- Dark mode support
- Accessibility features (high contrast, reduced motion)

### Theme Configuration

Theme configuration is handled in `src/styles/theme.ts` with:
- TypeScript interfaces for all theme values
- Light and dark theme variants
- Utility functions for theme resolution
- System theme detection

## Component Architecture

### Atomic Design Methodology

#### Atoms (Basic Building Blocks)
- **Button** - Versatile button with multiple variants and sizes
- **Input** - Text input with validation states
- **Label** - Accessible form labels
- **Badge** - Status indicators and labels
- **Avatar** - User profile images with fallbacks
- **Icon** - Consistent icon wrapper
- **Checkbox** - Custom checkbox with indeterminate state
- **Radio** - Custom radio buttons
- **Switch** - Toggle switches
- **Textarea** - Multi-line text input
- **Select** - Dropdown select component

#### Molecules (Combined Components)
- **FormField** - Wrapper for form inputs with labels and errors
- **Card** - Content containers with variants
- **Modal** - Accessible modal dialogs
- **Dropdown** - Dropdown menus with keyboard navigation
- **Tabs** - Tab navigation with multiple variants
- **Progress** - Progress bars with variants
- **Alert** - Notification messages

#### Organisms (Complex Components)
- **DataTable** - Sortable, searchable data tables
- **Form** - Dynamic form generation with validation

#### Templates (Page Layouts)
- **PageLayout** - Consistent page structure with header, sidebar, and content areas

## Usage Examples

### Basic Button
```tsx
import { Button } from '@/components/ui';

<Button variant="primary" size="md" loading={false}>
  Click me
</Button>
```

### Form with Validation
```tsx
import { Form } from '@/components/ui';

const MyForm = () => {
  const fields = [
    {
      name: 'email',
      label: 'Email',
      type: 'email' as const,
      required: true,
      validation: {
        pattern: '[^@ \\t\\r\\n]+@[^@ \\t\\r\\n]+\\.[^@ \\t\\r\\n]+',
        custom: (value: string) => {
          if (!value.includes('@')) return 'Invalid email';
        }
      }
    }
  ];

  const handleSubmit = (data: Record<string, any>) => {
    console.log(data);
  };

  return (
    <Form
      fields={fields}
      onSubmit={handleSubmit}
      submitText="Submit"
    />
  );
};
```

### Data Table
```tsx
import { DataTable } from '@/components/ui';

const MyTable = () => {
  const columns = [
    {
      key: 'name',
      title: 'Name',
      sortable: true,
    },
    {
      key: 'email',
      title: 'Email',
    },
    {
      key: 'status',
      title: 'Status',
      render: (value: string) => (
        <Badge variant={value === 'active' ? 'success' : 'secondary'}>
          {value}
        </Badge>
      )
    }
  ];

  const data = [
    { name: 'John Doe', email: 'john@example.com', status: 'active' },
    { name: 'Jane Smith', email: 'jane@example.com', status: 'inactive' }
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      search={{
        value: '',
        onChange: (value) => console.log(value)
      }}
    />
  );
};
```

### Theme Provider
```tsx
import { ThemeProvider } from '@/components/ui';

function App() {
  return (
    <ThemeProvider defaultMode="system">
      <YourApp />
    </ThemeProvider>
  );
}
```

### Page Layout
```tsx
import { PageLayout } from '@/components/ui';

const MyPage = () => {
  return (
    <PageLayout
      title="Dashboard"
      subtitle="Overview of your system"
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Dashboard' }
      ]}
      actions={
        <Button variant="primary">New Project</Button>
      }
    >
      <div>Your page content here</div>
    </PageLayout>
  );
};
```

## Accessibility Features

### WCAG 2.1 AA Compliance
- **Keyboard Navigation**: All interactive elements are keyboard accessible
- **ARIA Labels**: Proper ARIA attributes for screen readers
- **Focus Management**: Visible focus indicators and logical tab order
- **Color Contrast**: Meets WCAG AA contrast ratios
- **Screen Reader Support**: Semantic HTML and ARIA live regions

### Focus Management
- Custom focus ring utilities
- Trap focus within modals
- Restore focus after modal close
- Skip links for navigation

### Reduced Motion Support
- Respects `prefers-reduced-motion` media query
- Optional animations and transitions

### High Contrast Mode
- Adapts to `prefers-contrast: high`
- Enhanced borders and focus indicators

## Component Variants

### Button Variants
- `primary`, `secondary`, `success`, `warning`, `danger`, `info`
- `outline`, `ghost`, `link`
- Sizes: `sm`, `md`, `lg`
- Loading states
- Icon support

### Input States
- Default, error, success states
- Sizes: `sm`, `md`, `lg`
- Left and right icons
- Helper text and validation

### Color System
- Primary: Blue palette for main actions
- Secondary: Gray palette for secondary elements
- Semantic: Success (green), Warning (yellow), Error (red), Info (blue)
- Neutral: Gray scale for text and borders

## Customization

### Extending Themes
```tsx
import { lightTheme, Theme } from '@/styles/theme';

const customTheme: Theme = {
  ...lightTheme,
  colors: {
    ...lightTheme.colors,
    primary: {
      ...lightTheme.colors.primary,
      500: '#your-brand-color',
    }
  }
};
```

### Custom Components
Follow the established patterns:
- Use TypeScript interfaces for props
- Implement proper accessibility
- Support dark mode
- Use design tokens via CSS variables
- Include forwardRef for composition

## Performance Considerations

### Bundle Size
- Tree-shaking support for individual components
- CSS-in-JS with Tailwind for minimal CSS
- Lazy loading for heavy components

### Render Optimization
- React.memo for expensive components
- Proper key props for lists
- Debounced search and validation

## Testing

### Component Testing
Each component should have tests covering:
- Render behavior
- Prop variations
- User interactions
- Accessibility attributes
- Keyboard navigation

### Visual Testing
- Storybook stories for all component variants
- Visual regression testing
- Dark mode testing

## Migration Guide

### From Existing Components
1. Import from `@/components/ui` instead of individual files
2. Replace hardcoded values with design tokens
3. Add proper accessibility attributes
4. Implement dark mode support
5. Update TypeScript types

### Breaking Changes
- Some CSS class names have changed
- Props interfaces have been standardized
- Default variants may have changed

## Best Practices

### When to Use Which Component
- **Atoms**: For basic form controls and UI elements
- **Molecules**: For combined UI patterns (form fields, cards)
- **Organisms**: For complex, data-driven components
- **Templates**: For consistent page layouts

### Composition over Inheritance
- Prefer composing smaller components
- Use props for customization
- Keep components focused and single-purpose

### Consistency
- Follow established naming conventions
- Use design tokens instead of hardcoded values
- Maintain consistent prop interfaces
- Document component behavior

## Future Enhancements

### Planned Components
- DatePicker
- TimePicker
- FileUpload
- RichTextEditor
- Charts and Graphs
- Drag and Drop components

### Advanced Features
- Component theming API
- Animation library integration
- Advanced form validation
- Virtual scrolling for large datasets
- Component-level lazy loading