import React from 'react';
import AppLayout from '@/components/AppLayout';
import DatasetTable from './components/DatasetTable';

export default function DataManagementPage() {
  return (
    <AppLayout
      title="Data Management"
      subtitle="Review, profile, download and delete your uploaded datasets"
    >
      <DatasetTable />
    </AppLayout>
  );
}