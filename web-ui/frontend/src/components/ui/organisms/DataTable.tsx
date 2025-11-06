import React, { useState } from 'react';
import { cn } from '@/utils/cn';
import { Icon } from '../atoms/Icon';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Dropdown } from '../molecules/Dropdown';

export interface TableColumn<T> {
  key: keyof T;
  title: string;
  sortable?: boolean;
  render?: (value: any, row: T, index: number) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  empty?: React.ReactNode;
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  selection?: {
    selectedRows: T[];
    onSelectionChange: (rows: T[]) => void;
  };
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  actions?: {
    label: string;
    onClick: (row: T) => void;
    icon?: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'danger';
  }[];
  className?: string;
  rowClassName?: (row: T, index: number) => string;
  onRowClick?: (row: T, index: number) => void;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  empty = <div className="text-center py-8 text-text-muted">No data available</div>,
  pagination,
  selection,
  search,
  actions,
  className,
  rowClassName,
  onRowClick,
}: DataTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<{
    key: keyof T;
    direction: 'asc' | 'desc';
  } | null>(null);

  const handleSort = (key: keyof T) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleSelectAll = (checked: boolean) => {
    if (selection) {
      selection.onSelectionChange(checked ? data : []);
    }
  };

  const handleSelectRow = (row: T, checked: boolean) => {
    if (selection) {
      const newSelection = checked
        ? [...selection.selectedRows, row]
        : selection.selectedRows.filter((r) => r !== row);
      selection.onSelectionChange(newSelection);
    }
  };

  const isRowSelected = (row: T) => {
    return selection?.selectedRows.includes(row) || false;
  };

  const isAllSelected = selection ? selection.selectedRows.length === data.length : false;

  const sortedData = React.useMemo(() => {
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  const getAlignmentClass = (align?: 'left' | 'center' | 'right') => {
    switch (align) {
      case 'center':
        return 'text-center';
      case 'right':
        return 'text-right';
      default:
        return 'text-left';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="spinner spinner-lg" aria-label="Loading data" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search and Actions */}
      {(search || actions) && (
        <div className="flex items-center justify-between gap-4">
          {search && (
            <div className="flex-1 max-w-md">
              <Input
                placeholder={search.placeholder || 'Search...'}
                value={search.value}
                onChange={(e) => search.onChange(e.target.value)}
                leftIcon={
                  <Icon size="sm">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </Icon>
                }
              />
            </div>
          )}
          
          {actions && (
            <div className="flex items-center gap-2">
              {actions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || 'secondary'}
                  size="sm"
                  onClick={() => {/* Handle bulk action */}}
                >
                  {action.icon && <span className="mr-2">{action.icon}</span>}
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              {selection && (
                <th className="w-12">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                    aria-label="Select all rows"
                  />
                </th>
              )}
              
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={cn(
                    getAlignmentClass(column.align),
                    column.sortable && 'cursor-pointer hover:bg-surface-50'
                  )}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    {column.title}
                    {column.sortable && (
                      <div className="flex flex-col">
                        <Icon
                          size="xs"
                          className={cn(
                            '-mb-1 text-text-muted',
                            sortConfig?.key === column.key && sortConfig.direction === 'asc'
                              ? 'text-primary-600'
                              : ''
                          )}
                        >
                          <polyline points="18 15 12 9 6 15" />
                        </Icon>
                        <Icon
                          size="xs"
                          className={cn(
                            '-mt-1 text-text-muted',
                            sortConfig?.key === column.key && sortConfig.direction === 'desc'
                              ? 'text-primary-600'
                              : ''
                          )}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </Icon>
                      </div>
                    )}
                  </div>
                </th>
              ))}
              
              {actions && <th className="w-12">Actions</th>}
            </tr>
          </thead>
          
          <tbody>
            {sortedData.length === 0 ? (
              <tr>
                <td
                  colSpan={
                    columns.length +
                    (selection ? 1 : 0) +
                    (actions ? 1 : 0)
                  }
                  className="text-center py-8 text-text-muted"
                >
                  {empty}
                </td>
              </tr>
            ) : (
              sortedData.map((row, index) => (
                <tr
                  key={index}
                  className={cn(
                    onRowClick && 'cursor-pointer hover:bg-surface-variant',
                    rowClassName?.(row, index)
                  )}
                  onClick={() => onRowClick?.(row, index)}
                >
                  {selection && (
                    <td>
                      <input
                        type="checkbox"
                        checked={isRowSelected(row)}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleSelectRow(row, e.target.checked);
                        }}
                        className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                        aria-label={`Select row ${index + 1}`}
                      />
                    </td>
                  )}
                  
                  {columns.map((column) => (
                    <td
                      key={String(column.key)}
                      className={getAlignmentClass(column.align)}
                    >
                      {column.render
                        ? column.render(row[column.key], row, index)
                        : String(row[column.key] || '')}
                    </td>
                  ))}
                  
                  {actions && (
                    <td>
                      <Dropdown
                        trigger={
                          <Button variant="ghost" size="sm">
                            <Icon size="sm">
                              <circle cx="12" cy="12" r="1" />
                              <circle cx="12" cy="5" r="1" />
                              <circle cx="12" cy="19" r="1" />
                            </Icon>
                          </Button>
                        }
                        options={actions.map((action) => ({
                          value: action.label,
                          label: action.label,
                          icon: action.icon,
                          onClick: () => action.onClick(row),
                        }))}
                      />
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-text-muted">
            Showing {sortedData.length} of {data.length} results
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.currentPage === 1}
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
            >
              Previous
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={page === pagination.currentPage ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => pagination.onPageChange(page)}
                >
                  {page}
                </Button>
              ))}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.currentPage === pagination.totalPages}
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}