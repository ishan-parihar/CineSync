import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, Input, Badge, Avatar, Alert, Card } from '@/components/ui';

// Mock the cn utility
jest.mock('@/utils/cn', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

describe('Button Component', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('applies variant classes correctly', () => {
    render(<Button variant="primary">Primary Button</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('btn', 'btn-primary');
  });

  it('handles click events', async () => {
    const handleClick = jest.fn();
    const user = userEvent.setup();
    
    render(<Button onClick={handleClick}>Click me</Button>);
    
    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('shows loading state', () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByLabelText('Loading, please wait')).toBeInTheDocument();
  });

  it('can be disabled', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('supports left and right icons', () => {
    const LeftIcon = () => <span data-testid="left-icon">←</span>;
    const RightIcon = () => <span data-testid="right-icon">→</span>;
    
    render(
      <Button leftIcon={<LeftIcon />} rightIcon={<RightIcon />}>
        With Icons
      </Button>
    );
    
    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
  });
});

describe('Input Component', () => {
  it('renders input with label', () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('handles value changes', async () => {
    const handleChange = jest.fn();
    const user = userEvent.setup();
    
    render(<Input value="" onChange={handleChange} />);
    
    const input = screen.getByRole('textbox');
    await user.type(input, 'test@example.com');
    
    expect(handleChange).toHaveBeenCalled();
  });

  it('shows error state', () => {
    render(<Input error="This field is required" />);
    expect(screen.getByText(/this field is required/i)).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows helper text', () => {
    render(<Input helperText="Enter a valid email address" />);
    expect(screen.getByText(/enter a valid email address/i)).toBeInTheDocument();
  });

  it('can be disabled', () => {
    render(<Input disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('supports left and right icons', () => {
    const LeftIcon = () => <span data-testid="input-left-icon">@</span>;
    
    render(<Input leftIcon={<LeftIcon />} />);
    expect(screen.getByTestId('input-left-icon')).toBeInTheDocument();
  });
});

describe('Badge Component', () => {
  it('renders badge with text', () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('applies variant classes correctly', () => {
    render(<Badge variant="success">Success</Badge>);
    const badge = screen.getByText('Success');
    expect(badge).toHaveClass('badge', 'badge-success');
  });

  it('shows dot indicator', () => {
    render(<Badge dot>With Dot</Badge>);
    const badge = screen.getByText('With Dot');
    expect(badge.firstChild).toHaveClass('w-2', 'h-2', 'rounded-full');
  });

  it('can be removed', async () => {
    const handleRemove = jest.fn();
    const user = userEvent.setup();
    
    render(<Badge removable onRemove={handleRemove}>Removable</Badge>);
    
    await user.click(screen.getByLabelText('Remove badge'));
    expect(handleRemove).toHaveBeenCalledTimes(1);
  });
});

describe('Avatar Component', () => {
  it('renders with fallback text', () => {
    render(<Avatar fallback="John Doe" />);
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('renders with image', () => {
    render(
      <Avatar 
        src="https://example.com/avatar.jpg" 
        alt="John Doe"
        fallback="JD"
      />
    );
    const img = screen.getByAltText('John Doe');
    expect(img).toBeInTheDocument();
  });

  it('shows status indicator', () => {
    render(<Avatar fallback="JD" status="online" />);
    const statusDot = screen.getByLabelText('Status: online');
    expect(statusDot).toBeInTheDocument();
  });

  it('applies size classes correctly', () => {
    render(<Avatar size="lg" fallback="JD" />);
    const avatar = screen.getByText('JD').parentElement;
    expect(avatar).toHaveClass('w-12', 'h-12');
  });

  it('handles image error gracefully', async () => {
    render(
      <Avatar 
        src="https://invalid-url.com/avatar.jpg" 
        fallback="JD"
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('JD')).toBeInTheDocument();
    });
  });
});

describe('Alert Component', () => {
  it('renders alert with title and description', () => {
    render(
      <Alert variant="info" title="Info Title">
        This is the alert description.
      </Alert>
    );
    
    expect(screen.getByText('Info Title')).toBeInTheDocument();
    expect(screen.getByText('This is the alert description.')).toBeInTheDocument();
  });

  it('applies variant classes correctly', () => {
    render(<Alert variant="success">Success message</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('bg-success-50', 'border-success-200', 'text-success-800');
  });

  it('can be closed', async () => {
    const handleClose = jest.fn();
    const user = userEvent.setup();
    
    render(
      <Alert variant="info" closable onClose={handleClose}>
        Closable alert
      </Alert>
    );
    
    await user.click(screen.getByLabelText('Dismiss alert'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('has proper accessibility attributes', () => {
    render(<Alert variant="warning">Warning message</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'polite');
  });
});

describe('Card Component', () => {
  it('renders card with children', () => {
    render(
      <Card>
        <h2>Card Title</h2>
        <p>Card content</p>
      </Card>
    );
    
    expect(screen.getByText('Card Title')).toBeInTheDocument();
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('applies variant classes correctly', () => {
    render(<Card variant="elevated">Elevated Card</Card>);
    const card = screen.getByText('Elevated Card').parentElement;
    expect(card).toHaveClass('card', 'card-elevated');
  });

  it('applies padding correctly', () => {
    render(<Card padding="lg">Large Padding</Card>);
    const card = screen.getByText('Large Padding').parentElement;
    expect(card).toHaveClass('p-8');
  });

  it('shows loading state', () => {
    render(<Card loading>Loading Card</Card>);
    expect(screen.getByLabelText('Loading card content')).toBeInTheDocument();
  });

  it('can be hoverable', () => {
    render(<Card hoverable>Hoverable Card</Card>);
    const card = screen.getByText('Hoverable Card').parentElement;
    expect(card).toHaveClass('hover:shadow-lg');
  });
});

describe('Component Integration', () => {
  it('works together in a form-like scenario', async () => {
    const handleSubmit = jest.fn();
    const user = userEvent.setup();
    
    render(
      <Card>
        <h2>User Profile</h2>
        <Input label="Name" placeholder="Enter your name" />
        <Input label="Email" type="email" placeholder="Enter your email" />
        <Badge variant="info">New User</Badge>
        <Avatar fallback="JD" status="online" />
        <Button onClick={handleSubmit}>Save Profile</Button>
      </Card>
    );
    
    // Fill out the form
    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    
    // Submit the form
    await user.click(screen.getByRole('button', { name: /save profile/i }));
    
    expect(handleSubmit).toHaveBeenCalledTimes(1);
  });

  it('maintains accessibility in complex layouts', () => {
    render(
      <Card>
        <Alert variant="info" title="Form Instructions">
          Please fill out all required fields marked with an asterisk (*).
        </Alert>
        
        <Input label="Required Field" required error="This field is required" />
        
        <div className="flex items-center gap-2">
          <Badge variant="success">Verified</Badge>
          <Avatar fallback="U" status="online" />
          <span>User Status</span>
        </div>
        
        <Button>Submit</Button>
      </Card>
    );
    
    // Check for proper ARIA attributes
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByLabelText(/required field/i)).toHaveAttribute('aria-required', 'true');
    expect(screen.getByLabelText(/required field/i)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Status: online')).toBeInTheDocument();
  });
});