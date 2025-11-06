'use client';

import React, { useState } from 'react';
import { PageLayout } from '@/components/ui/templates/PageLayout';
import { Button, Input, Card, Badge, Avatar, Progress, Alert, Tabs, Modal } from '@/components/ui';

export default function ComponentShowcase() {
  const [inputValue, setInputValue] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [progress, setProgress] = useState(45);

  const tabsData = [
    {
      value: 'components',
      label: 'Components',
      content: (
        <div className="space-y-8">
          {/* Buttons */}
          <Card>
            <h3 className="text-lg font-semibold mb-4">Buttons</h3>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="success">Success</Button>
              <Button variant="warning">Warning</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button loading>Loading</Button>
            </div>
          </Card>

          {/* Input and Form Elements */}
          <Card>
            <h3 className="text-lg font-semibold mb-4">Form Elements</h3>
            <div className="space-y-4 max-w-md">
              <Input
                label="Email Address"
                type="email"
                placeholder="Enter your email"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                helperText="We'll never share your email with anyone else."
              />
              
              <Input
                label="Password"
                type="password"
                placeholder="Enter your password"
                error="Password is required"
              />
              
              <Input
                label="Success Input"
                type="text"
                placeholder="Success state"
                success="This field is valid"
              />
            </div>
          </Card>

          {/* Badges */}
          <Card>
            <h3 className="text-lg font-semibold mb-4">Badges</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="primary">Primary</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="error">Error</Badge>
              <Badge variant="info">Info</Badge>
              <Badge dot variant="success">With Dot</Badge>
              <Badge removable variant="primary" onRemove={() => console.log('removed')}>
                Removable
              </Badge>
            </div>
          </Card>

          {/* Avatars */}
          <Card>
            <h3 className="text-lg font-semibold mb-4">Avatars</h3>
            <div className="flex items-center gap-4">
              <Avatar size="xs" fallback="JD" />
              <Avatar size="sm" fallback="JD" />
              <Avatar size="md" fallback="JD" />
              <Avatar size="lg" fallback="JD" />
              <Avatar size="xl" fallback="JD" />
              <Avatar size="2xl" fallback="JD" />
              <Avatar
                size="md"
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face"
                alt="John Doe"
                status="online"
              />
              <Avatar
                size="md"
                fallback="AS"
                status="busy"
                bordered
              />
            </div>
          </Card>

          {/* Progress */}
          <Card>
            <h3 className="text-lg font-semibold mb-4">Progress Bars</h3>
            <div className="space-y-4">
              <Progress value={progress} label="Upload Progress" showPercentage />
              <Progress value={75} variant="success" size="sm" />
              <Progress value={30} variant="warning" showLabel />
              <Progress value={90} variant="error" size="lg" striped animated />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setProgress(Math.max(0, progress - 10))}>
                  -10%
                </Button>
                <Button size="sm" onClick={() => setProgress(Math.min(100, progress + 10))}>
                  +10%
                </Button>
              </div>
            </div>
          </Card>
        </div>
      ),
    },
    {
      value: 'alerts',
      label: 'Alerts',
      content: (
        <div className="space-y-4">
          <Alert variant="info" title="Information">
            This is an informational message to provide context or guidance.
          </Alert>
          
          <Alert variant="success" title="Success!">
            Your changes have been saved successfully.
          </Alert>
          
          <Alert variant="warning" title="Warning">
            Please review your input before proceeding.
          </Alert>
          
          <Alert variant="error" title="Error" closable>
            Something went wrong. Please try again later.
          </Alert>
          
          <Alert variant="info">
            Alert without title, just a description message.
          </Alert>
        </div>
      ),
    },
    {
      value: 'advanced',
      label: 'Advanced',
      content: (
        <div className="space-y-8">
          <Card>
            <h3 className="text-lg font-semibold mb-4">Modal Example</h3>
            <Button onClick={() => setModalOpen(true)}>Open Modal</Button>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold mb-4">Interactive Components</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">Current Progress:</span>
                <Progress value={progress} size="sm" className="flex-1" />
                <span className="text-sm text-text-muted">{progress}%</span>
              </div>
              
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setProgress(0)}>Reset</Button>
                <Button size="sm" onClick={() => setProgress(25)}>25%</Button>
                <Button size="sm" onClick={() => setProgress(50)}>50%</Button>
                <Button size="sm" onClick={() => setProgress(75)}>75%</Button>
                <Button size="sm" onClick={() => setProgress(100)}>100%</Button>
              </div>
            </div>
          </Card>
        </div>
      ),
    },
  ];

  return (
    <PageLayout
      title="Component Library"
      subtitle="Interactive showcase of the design system components"
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Components' }
      ]}
      actions={
        <Button variant="outline">
          View Documentation
        </Button>
      }
    >
      <Tabs
        options={tabsData}
        defaultValue="components"
      />

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Example Modal"
        description="This is an example modal to demonstrate the component."
        size="md"
        showFooter
        footerContent={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setModalOpen(false)}>
              Confirm
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p>
            This is the modal content area. You can put any content here including forms,
            tables, or other components.
          </p>
          
          <Input
            label="Example Input"
            placeholder="Type something here..."
          />
          
          <Alert variant="info">
            Modals support focus trapping, keyboard navigation, and accessibility features.
          </Alert>
        </div>
      </Modal>
    </PageLayout>
  );
}