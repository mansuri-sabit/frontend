import React, { useState } from 'react';
import { Button, Input, Label, Select, Checkbox } from '../ui';
import toast from '@/lib/toast';
import { apiClient } from '../../lib/api';

const ExportModal = ({ isOpen, onClose, onExport }) => {
  const [loading, setLoading] = useState(false);
  const [exportData, setExportData] = useState({
    format: 'json',
    dateFrom: '',
    dateTo: '',
    limit: 10000,
    includeGeo: true,
    includeMeta: false,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (!exportData.format) {
        toast.error('Please select an export format');
        return;
      }

      if (exportData.limit && (isNaN(exportData.limit) || exportData.limit < 1)) {
        toast.error('Maximum records must be a positive number');
        return;
      }

      // Validate date range
      if (exportData.dateFrom && exportData.dateTo) {
        const fromDate = new Date(exportData.dateFrom);
        const toDate = new Date(exportData.dateTo);
        if (fromDate > toDate) {
          toast.error('From date cannot be after To date');
          return;
        }
      }

      // Prepare export data
      const exportRequest = {
        format: exportData.format,
        limit: exportData.limit ? parseInt(exportData.limit) : undefined,
        include_geo: exportData.includeGeo,
        include_meta: exportData.includeMeta,
      };

      // Add date range if provided
      if (exportData.dateFrom) {
        exportRequest.date_from = new Date(exportData.dateFrom).toISOString();
      }
      if (exportData.dateTo) {
        exportRequest.date_to = new Date(exportData.dateTo).toISOString();
      }

      // Call export API
      const response = await apiClient.exportChats(exportRequest);
      
      if (response.success) {
        toast.success(`Export generated successfully! ${response.record_count || 0} records exported.`);
        onExport?.(response);
      } else {
        toast.error(response.message || 'Export failed - please try again');
      }
    } catch (error) {
      console.error('Export error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to export chat data';
      toast.error(`Export failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDirectDownload = async () => {
    setLoading(true);

    try {
      // Validate required fields
      if (!exportData.format) {
        toast.error('Please select an export format');
        return;
      }

      if (exportData.limit && (isNaN(exportData.limit) || exportData.limit < 1)) {
        toast.error('Maximum records must be a positive number');
        return;
      }

      // Validate date range
      if (exportData.dateFrom && exportData.dateTo) {
        const fromDate = new Date(exportData.dateFrom);
        const toDate = new Date(exportData.dateTo);
        if (fromDate > toDate) {
          toast.error('From date cannot be after To date');
          return;
        }
      }

      const params = {
        format: exportData.format,
        limit: exportData.limit ? parseInt(exportData.limit) : undefined,
        include_geo: exportData.includeGeo,
        include_meta: exportData.includeMeta,
      };

      if (exportData.dateFrom) {
        params.date_from = new Date(exportData.dateFrom).toISOString();
      }
      if (exportData.dateTo) {
        params.date_to = new Date(exportData.dateTo).toISOString();
      }

      const result = await apiClient.downloadChatExport(params);
      if (result && result.success) {
        toast.success(`Export downloaded successfully! File: ${result.filename} (${result.size} bytes)`);
        onClose();
      } else {
        toast.error('Download failed - no file received from server');
      }
    } catch (error) {
      console.error('Download error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to download export';
      toast.error(`Download failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Export Chat Data</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Download your chat data in various formats</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Export Format */}
            <div className="space-y-2">
              <Label htmlFor="format" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Export Format <span className="text-red-500">*</span>
              </Label>
              <Select
                id="format"
                value={exportData.format}
                onChange={(value) => setExportData({ ...exportData, format: value })}
                options={[
                  { value: 'json', label: 'JSON - Structured data with analytics' },
                  { value: 'excel', label: 'Excel (.xlsx) - Multi-sheet workbook' },
                  { value: 'both', label: 'ZIP - Both JSON and Excel files' }
                ]}
                placeholder="Select export format..."
                className="mt-1"
              />
            </div>

            {/* Date Range */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Date Range (Optional)
              </Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="dateFrom" className="text-xs text-gray-500 dark:text-gray-400">From Date</Label>
                  <Input
                    id="dateFrom"
                    type="date"
                    value={exportData.dateFrom}
                    onChange={(e) => setExportData({ ...exportData, dateFrom: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="dateTo" className="text-xs text-gray-500 dark:text-gray-400">To Date</Label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={exportData.dateTo}
                    onChange={(e) => setExportData({ ...exportData, dateTo: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Record Limit */}
            <div className="space-y-2">
              <Label htmlFor="limit" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Maximum Records
              </Label>
              <Input
                id="limit"
                type="number"
                min="1"
                max="100000"
                value={exportData.limit}
                onChange={(e) => setExportData({ ...exportData, limit: e.target.value })}
                className="mt-1"
                placeholder="10000"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Leave empty for no limit (not recommended for large datasets)
              </p>
            </div>

            {/* Data Options */}
            <div className="space-y-4">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Data Inclusion Options
              </Label>
              
              <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="includeGeo"
                    checked={exportData.includeGeo}
                    onChange={(e) => setExportData({ ...exportData, includeGeo: e.target.checked })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label htmlFor="includeGeo" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Include Geolocation Data
                    </Label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Country, region, city, ISP, IP type (95% accurate)
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="includeMeta"
                    checked={exportData.includeMeta}
                    onChange={(e) => setExportData({ ...exportData, includeMeta: e.target.checked })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label htmlFor="includeMeta" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Include Metadata
                    </Label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      User IDs, creation timestamps, client information
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200 dark:border-gray-600">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Exporting...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span>Export</span>
                  </div>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleDirectDownload}
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Downloading...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Download Now</span>
                  </div>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </form>

          {/* Export Info */}
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center space-x-2 mb-3">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">Export Information</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="font-medium text-blue-900 dark:text-blue-100">JSON:</span>
                  <span className="text-blue-700 dark:text-blue-300">Structured data with analytics</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="font-medium text-blue-900 dark:text-blue-100">Excel:</span>
                  <span className="text-blue-700 dark:text-blue-300">Multi-sheet workbook</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="font-medium text-blue-900 dark:text-blue-100">ZIP:</span>
                  <span className="text-blue-700 dark:text-blue-300">Both JSON and Excel files</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span className="font-medium text-blue-900 dark:text-blue-100">Geolocation:</span>
                  <span className="text-blue-700 dark:text-blue-300">95% accurate detection</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="font-medium text-blue-900 dark:text-blue-100">Security:</span>
                  <span className="text-blue-700 dark:text-blue-300">Role-based access</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
