// src/features/client/pages/EmailTemplates.jsx
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Alert } from '../../../components/ui/Alert';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Trash2, Edit } from 'lucide-react';
import toast from '@/lib/toast';
import api from '../../../lib/api';

const EmailTemplates = () => {
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFields, setEditFields] = useState({});
  const [fields, setFields] = useState({
    // Basic information
    companyName: '',
    companyDescription: '',
    
    // Greeting/Welcome section
    greetingMessage: '',
    serviceIntroduction: '',
    
    // Services section
    serviceBenefits: '',
    freePanelMessage: '',
    retailRateMessage: '',
    
    // Pricing plans (array)
    pricingPlans: [
      { title: '', price: '', rate: '', isActive: true, displayOrder: 0 },
      { title: '', price: '', rate: '', isActive: true, displayOrder: 1 },
      { title: '', price: '', rate: '', isActive: true, displayOrder: 2 },
    ],
    
    // How it works section
    howItWorksTitle: '',
    howItWorksFeatures: ['', '', '', '', ''],
    
    // Demo section
    demoTitle: '',
    demoDescription: '',
    demoURL: '',
    demoUsername: '',
    demoPassword: '',
    
    // Links section
    companyProfileURL: '',
    clientListURL: '',
    faqsURL: '',
    
    // Footer/CTA section
    ctaTitle: '',
    ctaMessage: '',
    
    // Footer contact information
    footerName: '',
    footerPhone: '',
    footerEmail: '',
    footerWebsite: '',
    
    // Special offers
    specialDiscountMessage: '',
  });

  useEffect(() => {
    loadTemplate();
  }, []);

  const loadTemplate = async () => {
    try {
      setLoading(true);
      const response = await api.get('/client/email-templates/quote_visitor');
      
      console.log('Load template response:', response);
      
      if (response) {
        // Template exists - fetch and auto-fill form fields
        // api.get() already returns data directly, not response.data
        setTemplate(response);
        // Handle both template_fields and templateFields (camelCase/snake_case)
        const tf = response.template_fields || response.templateFields || {};
        
        console.log('Template fields from response:', tf);
        
        // Auto-fill all form fields from database
        const loadedFields = {
          companyName: tf.company_name || tf.companyName || '',
          companyDescription: tf.company_description || tf.companyDescription || '',
          greetingMessage: tf.greeting_message || tf.greetingMessage || '',
          serviceIntroduction: tf.service_introduction || tf.serviceIntroduction || '',
          serviceBenefits: tf.service_benefits || tf.serviceBenefits || '',
          freePanelMessage: tf.free_panel_message || tf.freePanelMessage || '',
          retailRateMessage: tf.retail_rate_message || tf.retailRateMessage || '',
          pricingPlans: (tf.pricing_plans || tf.pricingPlans || []).length > 0 
            ? (tf.pricing_plans || tf.pricingPlans).map((plan, idx) => ({
                title: plan.title || '',
                price: plan.price || '',
                rate: plan.rate || '',
                isActive: plan.is_active !== undefined ? plan.is_active : (plan.isActive !== undefined ? plan.isActive : true),
                displayOrder: plan.display_order !== undefined ? plan.display_order : (plan.displayOrder !== undefined ? plan.displayOrder : idx),
              }))
            : [
                { title: '', price: '', rate: '', isActive: true, displayOrder: 0 },
                { title: '', price: '', rate: '', isActive: true, displayOrder: 1 },
                { title: '', price: '', rate: '', isActive: true, displayOrder: 2 },
              ],
          howItWorksTitle: tf.how_it_works_title || tf.howItWorksTitle || '',
          howItWorksFeatures: (tf.how_it_works_features || tf.howItWorksFeatures || []).length > 0
            ? [...(tf.how_it_works_features || tf.howItWorksFeatures), '', '', '', ''].slice(0, 5)
            : ['', '', '', '', ''],
          demoTitle: tf.demo_title || tf.demoTitle || '',
          demoDescription: tf.demo_description || tf.demoDescription || '',
          demoURL: tf.demo_url || tf.demoURL || '',
          demoUsername: tf.demo_username || tf.demoUsername || '',
          demoPassword: tf.demo_password || tf.demoPassword || '',
          companyProfileURL: tf.company_profile_url || tf.companyProfileURL || '',
          clientListURL: tf.client_list_url || tf.clientListURL || '',
          faqsURL: tf.faqs_url || tf.faqsURL || '',
          ctaTitle: tf.cta_title || tf.ctaTitle || '',
          ctaMessage: tf.cta_message || tf.ctaMessage || '',
          footerName: tf.footer_name || tf.footerName || '',
          footerPhone: tf.footer_phone || tf.footerPhone || '',
          footerEmail: tf.footer_email || tf.footerEmail || '',
          footerWebsite: tf.footer_website || tf.footerWebsite || '',
          specialDiscountMessage: tf.special_discount_message || tf.specialDiscountMessage || '',
        };
        
        console.log('Loaded fields:', loadedFields);
        setFields(loadedFields);
      } else {
        console.warn('No template data in response');
        // Initialize empty fields if no data
        setFields({
          companyName: '',
          companyDescription: '',
          greetingMessage: '',
          serviceIntroduction: '',
          serviceBenefits: '',
          freePanelMessage: '',
          retailRateMessage: '',
          pricingPlans: [
            { title: '', price: '', rate: '', isActive: true, displayOrder: 0 },
            { title: '', price: '', rate: '', isActive: true, displayOrder: 1 },
            { title: '', price: '', rate: '', isActive: true, displayOrder: 2 },
          ],
          howItWorksTitle: '',
          howItWorksFeatures: ['', '', '', '', ''],
          demoTitle: '',
          demoDescription: '',
          demoURL: '',
          demoUsername: '',
          demoPassword: '',
          companyProfileURL: '',
          clientListURL: '',
          faqsURL: '',
          ctaTitle: '',
          ctaMessage: '',
          footerName: '',
          footerPhone: '',
          footerEmail: '',
          footerWebsite: '',
          specialDiscountMessage: '',
        });
      }
    } catch (error) {
      if (error.response?.status === 404) {
        // Template doesn't exist yet - this is normal, not an error
        console.log('Template not found (404)');
        setTemplate(null);
        // Initialize empty fields if template doesn't exist
        setFields({
          companyName: '',
          companyDescription: '',
          greetingMessage: '',
          serviceIntroduction: '',
          serviceBenefits: '',
          freePanelMessage: '',
          retailRateMessage: '',
          pricingPlans: [
            { title: '', price: '', rate: '', isActive: true, displayOrder: 0 },
            { title: '', price: '', rate: '', isActive: true, displayOrder: 1 },
            { title: '', price: '', rate: '', isActive: true, displayOrder: 2 },
          ],
          howItWorksTitle: '',
          howItWorksFeatures: ['', '', '', '', ''],
          demoTitle: '',
          demoDescription: '',
          demoURL: '',
          demoUsername: '',
          demoPassword: '',
          companyProfileURL: '',
          clientListURL: '',
          faqsURL: '',
          ctaTitle: '',
          ctaMessage: '',
          footerName: '',
          footerPhone: '',
          footerEmail: '',
          footerWebsite: '',
          specialDiscountMessage: '',
        });
      } else {
        // Only show error for non-404 errors (network issues, server errors, etc.)
        toast.error('Failed to load email template');
        console.error('Error loading template:', error);
        console.error('Error response:', error.response);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    console.log('Save button clicked');
    try {
      setSaving(true);
      console.log('Saving state set to true');
      
      const templateFields = {
        company_name: fields.companyName,
        company_description: fields.companyDescription,
        greeting_message: fields.greetingMessage,
        service_introduction: fields.serviceIntroduction,
        service_benefits: fields.serviceBenefits,
        free_panel_message: fields.freePanelMessage,
        retail_rate_message: fields.retailRateMessage,
        pricing_plans: fields.pricingPlans
          .filter(p => p.title || p.price || p.rate)
          .map((plan, idx) => ({
            title: plan.title || '',
            price: plan.price || '',
            rate: plan.rate || '',
            is_active: plan.isActive ?? true,
            display_order: plan.displayOrder ?? idx,
          })),
        how_it_works_title: fields.howItWorksTitle,
        how_it_works_features: fields.howItWorksFeatures.filter(f => f.trim()),
        demo_title: fields.demoTitle,
        demo_description: fields.demoDescription,
        demo_url: fields.demoURL,
        demo_username: fields.demoUsername,
        demo_password: fields.demoPassword,
        company_profile_url: fields.companyProfileURL,
        client_list_url: fields.clientListURL,
        faqs_url: fields.faqsURL,
        cta_title: fields.ctaTitle,
        cta_message: fields.ctaMessage,
        footer_name: fields.footerName,
        footer_phone: fields.footerPhone,
        footer_email: fields.footerEmail,
        footer_website: fields.footerWebsite,
        special_discount_message: fields.specialDiscountMessage,
      };

      console.log('Template fields prepared:', templateFields);
      let saveSuccess = false;
      let successMessage = '';

      // Always check if template exists in database first (by type)
      let existingTemplateId = null;
      try {
        const checkResponse = await api.get('/client/email-templates/quote_visitor');
        if (checkResponse) {
          // Handle both _id and id (MongoDB ObjectID can be returned as either)
          // api.get() already returns data directly
          existingTemplateId = checkResponse._id || checkResponse.id || 
                              (checkResponse.ID ? checkResponse.ID.toString() : null);
          console.log('Template exists in database with ID:', existingTemplateId);
        }
      } catch (checkError) {
        if (checkError.response?.status === 404) {
          console.log('Template does not exist in database');
        } else {
          console.error('Error checking template:', checkError);
        }
      }

      // If template exists (in state or database), UPDATE it
      // Handle both _id and id formats
      const templateId = template?._id || template?.id || 
                         (template?.ID ? template.ID.toString() : null) || 
                         existingTemplateId;
      console.log('Final template ID to use:', templateId);

      if (templateId) {
        // Template exists - UPDATE it
        console.log('Updating existing template with ID:', templateId);
        try {
          const response = await api.put(`/client/email-templates/${templateId}`, {
            subject: `Thank You for Your Interest - {{companyName}}`,
            html_body: generateHTMLTemplate(templateFields),
            text_body: generateTextTemplate(templateFields),
            template_fields: templateFields,
          });
          saveSuccess = true;
          successMessage = 'Email template updated successfully!';
          console.log('Update successful');
          console.log('Update response:', response);
          // api.put() already returns data directly
          if (response) {
            // Handle both _id and id formats
            const updatedTemplate = response;
            console.log('Setting template from update response:', updatedTemplate);
            setTemplate(updatedTemplate);
          }
        } catch (error) {
          console.error('Update error:', error);
          if (error.response?.status === 404) {
            // Template was deleted from database, create new one
            console.log('Template was deleted, creating new one...');
            try {
              const createResponse = await api.post('/client/email-templates', {
                type: 'quote_visitor',
                name: 'Send Email to Visitor with Quote Information',
                subject: `Thank You for Your Interest - {{companyName}}`,
                html_body: generateHTMLTemplate(templateFields),
                text_body: generateTextTemplate(templateFields),
                template_fields: templateFields,
                is_active: true,
              });
              saveSuccess = true;
              successMessage = 'Email template created successfully!';
              console.log('Create response:', createResponse);
              // api.post() already returns data directly
              if (createResponse) {
                console.log('Setting template from create response:', createResponse);
                setTemplate(createResponse);
              }
            } catch (createError) {
              console.error('Create after delete error:', createError);
              throw createError;
            }
          } else {
            throw error;
          }
        }
      } else {
        // Template doesn't exist - CREATE new one
        console.log('Template does not exist, creating new...');
        try {
          const createResponse = await api.post('/client/email-templates', {
            type: 'quote_visitor',
            name: 'Send Email to Visitor with Quote Information',
            subject: `Thank You for Your Interest - {{companyName}}`,
            html_body: generateHTMLTemplate(templateFields),
            text_body: generateTextTemplate(templateFields),
            template_fields: templateFields,
            is_active: true,
          });
          console.log('Create response:', createResponse);
          // api.post() already returns data directly
          saveSuccess = true;
          successMessage = 'Email template created successfully!';
          if (createResponse) {
            console.log('Setting template from create response:', createResponse);
            setTemplate(createResponse);
          }
        } catch (createError) {
          console.error('Create error:', createError);
          // If create fails with 409 (conflict), template exists - fetch and update it
          if (createError.response?.status === 409) {
            console.log('Template exists (409 conflict), fetching and updating...');
            try {
              const existingResponse = await api.get('/client/email-templates/quote_visitor');
              if (existingResponse) {
                // api.get() already returns data directly
                const existingId = existingResponse._id || existingResponse.id;
                if (existingId) {
                  console.log('Updating existing template with ID:', existingId);
                  const updateResponse = await api.put(`/client/email-templates/${existingId}`, {
                    subject: `Thank You for Your Interest - {{companyName}}`,
                    html_body: generateHTMLTemplate(templateFields),
                    text_body: generateTextTemplate(templateFields),
                    template_fields: templateFields,
                  });
                  saveSuccess = true;
                  successMessage = 'Email template updated successfully!';
                  console.log('Update after conflict successful');
                  console.log('Update after conflict response:', updateResponse);
                  // api.put() already returns data directly
                  if (updateResponse) {
                    console.log('Setting template from update after conflict response:', updateResponse);
                    setTemplate(updateResponse);
                  }
                } else {
                  throw createError;
                }
              } else {
                throw createError;
              }
            } catch (updateError) {
              console.error('Update after conflict error:', updateError);
              throw createError;
            }
          } else {
            throw createError;
          }
        }
      }
      
      // Show success message and reload template
      if (saveSuccess) {
        console.log('Save successful, showing notification');
        // Show notification immediately
        toast.success(successMessage);
        
        // Small delay to ensure database write is complete
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Reload template after successful save
        try {
          await loadTemplate();
          console.log('Template reloaded successfully after save');
        } catch (loadError) {
          // Don't fail the save if reload fails, just log it
          console.warn('Failed to reload template after save:', loadError);
          console.warn('Load error details:', loadError.response);
        }
      } else {
        console.warn('Save was not successful - saveSuccess is false');
        toast.error('Failed to save template - no operation completed');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save email template';
      toast.error(errorMessage);
      console.error('Error saving template:', error);
    } finally {
      setSaving(false);
    }
  };

  const generateHTMLTemplate = (fields) => {
    // Template HTML is generated dynamically by backend from template_fields
    // This is a placeholder - actual email HTML is generated at send time
    return `<!-- Email template HTML is generated dynamically from template_fields by the backend -->`;
  };

  const generateTextTemplate = (fields) => {
    // Template text is generated dynamically by backend from template_fields
    // This is a placeholder - actual email text is generated at send time
    return `<!-- Email template text is generated dynamically from template_fields by the backend -->`;
  };

  const updateField = (key, value) => {
    setFields(prev => ({ ...prev, [key]: value }));
  };

  const updatePricingPlan = (index, field, value) => {
    const newPlans = [...fields.pricingPlans];
    newPlans[index] = { ...newPlans[index], [field]: value };
    setFields(prev => ({ ...prev, pricingPlans: newPlans }));
  };

  const updateFeature = (index, value) => {
    const newFeatures = [...fields.howItWorksFeatures];
    newFeatures[index] = value;
    setFields(prev => ({ ...prev, howItWorksFeatures: newFeatures }));
  };

  const addPricingPlan = () => {
    setFields(prev => ({
      ...prev,
      pricingPlans: [
        ...prev.pricingPlans,
        { title: '', price: '', rate: '', isActive: true, displayOrder: prev.pricingPlans.length },
      ],
    }));
  };

  const removePricingPlan = (index) => {
    setFields(prev => ({
      ...prev,
      pricingPlans: prev.pricingPlans.filter((_, i) => i !== index),
    }));
  };

  const openEditModal = () => {
    // Copy current fields to edit fields
    setEditFields(JSON.parse(JSON.stringify(fields)));
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
  };

  const updateEditField = (key, value) => {
    setEditFields(prev => ({ ...prev, [key]: value }));
  };

  const updateEditPricingPlan = (index, field, value) => {
    const newPlans = [...editFields.pricingPlans];
    newPlans[index] = { ...newPlans[index], [field]: value };
    setEditFields(prev => ({ ...prev, pricingPlans: newPlans }));
  };

  const updateEditFeature = (index, value) => {
    const newFeatures = [...editFields.howItWorksFeatures];
    newFeatures[index] = value;
    setEditFields(prev => ({ ...prev, howItWorksFeatures: newFeatures }));
  };

  const removeEditPricingPlan = (index) => {
    setEditFields(prev => ({
      ...prev,
      pricingPlans: prev.pricingPlans.filter((_, i) => i !== index),
    }));
  };

  const clearField = (key) => {
    if (key === 'pricingPlans') {
      setEditFields(prev => ({
        ...prev,
        pricingPlans: [
          { title: '', price: '', rate: '', isActive: true, displayOrder: 0 },
          { title: '', price: '', rate: '', isActive: true, displayOrder: 1 },
          { title: '', price: '', rate: '', isActive: true, displayOrder: 2 },
        ],
      }));
    } else if (key === 'howItWorksFeatures') {
      setEditFields(prev => ({
        ...prev,
        howItWorksFeatures: ['', '', '', '', ''],
      }));
    } else {
      setEditFields(prev => ({ ...prev, [key]: '' }));
    }
  };

  const saveEditChanges = () => {
    // Update main fields with edited values
    setFields(editFields);
    setIsEditModalOpen(false);
    toast.success('Changes applied successfully!');
  };

  if (loading) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <Skeleton className="h-8 sm:h-12 w-48 sm:w-64 mb-4 sm:mb-6" />
        <Skeleton className="h-64 sm:h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 max-w-7xl">
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-0">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">Email Templates</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage your email templates for quote requests and communications
          </p>
        </div>
        <Button
          onClick={openEditModal}
          variant="outline"
          className="flex items-center gap-2 w-full sm:w-auto"
        >
          <Edit className="h-4 w-4" />
          Edit
        </Button>
      </div>

      <div className="mb-4 border-b border-border overflow-x-auto">
        <nav className="flex space-x-2 sm:space-x-4 min-w-max sm:min-w-0">
          {['basic', 'services', 'pricing', 'how-it-works', 'demo', 'footer'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-2 sm:px-4 py-2 font-medium text-xs sm:text-sm whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
            </button>
          ))}
        </nav>
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">Send Email to Visitor with Quote Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
          {/* Basic Information Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5 sm:mb-2">
                  Company Name
                </label>
                <Input
                  value={fields.companyName}
                  onChange={(e) => updateField('companyName', e.target.value)}
                  placeholder="Enter company name"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5 sm:mb-2">
                  Company Description
                </label>
                <Textarea
                  value={fields.companyDescription}
                  onChange={(e) => updateField('companyDescription', e.target.value)}
                  placeholder="Enter company description"
                  rows={4}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5 sm:mb-2">
                  Greeting Message
                </label>
                <Textarea
                  value={fields.greetingMessage}
                  onChange={(e) => updateField('greetingMessage', e.target.value)}
                  placeholder="Hi, Thanks for the consideration..."
                  rows={2}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5 sm:mb-2">
                  Service Introduction
                </label>
                <Textarea
                  value={fields.serviceIntroduction}
                  onChange={(e) => updateField('serviceIntroduction', e.target.value)}
                  placeholder="Introduction to services"
                  rows={3}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {/* Services Tab */}
          {activeTab === 'services' && (
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5 sm:mb-2">
                  Service Benefits / Why Choose Us
                </label>
                <Textarea
                  value={fields.serviceBenefits}
                  onChange={(e) => updateField('serviceBenefits', e.target.value)}
                  placeholder="Why choose our services..."
                  rows={4}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5 sm:mb-2">
                  Free Panel Message
                </label>
                <Input
                  value={fields.freePanelMessage}
                  onChange={(e) => updateField('freePanelMessage', e.target.value)}
                  placeholder="You will get a Free Panel, Complimentary Premium Database..."
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5 sm:mb-2">
                  Retail Rate Message
                </label>
                <Input
                  value={fields.retailRateMessage}
                  onChange={(e) => updateField('retailRateMessage', e.target.value)}
                  placeholder="Retail Rate: 60 Paisa Per Message"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5 sm:mb-2">
                  Special Discount Message
                </label>
                <Textarea
                  value={fields.specialDiscountMessage}
                  onChange={(e) => updateField('specialDiscountMessage', e.target.value)}
                  placeholder="For any Quantity above 10 Lacs Messages we have Special Discounts."
                  rows={2}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {/* Pricing Plans Tab */}
          {activeTab === 'pricing' && (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-semibold">Pricing Plans</h3>
                <Button onClick={addPricingPlan} variant="outline" size="sm" className="w-full sm:w-auto">
                  + Add Plan
                </Button>
              </div>

              {fields.pricingPlans.map((plan, index) => (
                <Card key={index} className="p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-0 mb-3 sm:mb-4">
                    <h4 className="font-medium text-sm sm:text-base">Plan {index + 1}</h4>
                    {fields.pricingPlans.length > 1 && (
                      <Button
                        onClick={() => removePricingPlan(index)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 w-full sm:w-auto"
                      >
                        Remove
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2 sm:space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Plan Title
                      </label>
                      <Input
                        value={plan.title}
                        onChange={(e) => updatePricingPlan(index, 'title', e.target.value)}
                        placeholder="e.g., Buy 2 Lac WhatsApp messages, Get 1 Lac Free"
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Package Price
                      </label>
                      <Input
                        value={plan.price}
                        onChange={(e) => updatePricingPlan(index, 'price', e.target.value)}
                        placeholder="e.g., INR 1,20,000/- Plus GST"
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Rate per Message
                      </label>
                      <Input
                        value={plan.rate}
                        onChange={(e) => updatePricingPlan(index, 'rate', e.target.value)}
                        placeholder="e.g., @40 Paisa Per Message"
                        className="w-full"
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* How It Works Tab */}
          {activeTab === 'how-it-works' && (
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5 sm:mb-2">
                  How It Works Title
                </label>
                <Input
                  value={fields.howItWorksTitle}
                  onChange={(e) => updateField('howItWorksTitle', e.target.value)}
                  placeholder="How does our WhatsApp Marketing work?"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5 sm:mb-2">
                  Features (How It Works)
                </label>
                {fields.howItWorksFeatures.map((feature, index) => (
                  <Input
                    key={index}
                    value={feature}
                    onChange={(e) => updateFeature(index, e.target.value)}
                    placeholder={`Feature ${index + 1}`}
                    className="mb-2 w-full"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Demo Tab */}
          {activeTab === 'demo' && (
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5 sm:mb-2">
                  Demo Title
                </label>
                <Input
                  value={fields.demoTitle}
                  onChange={(e) => updateField('demoTitle', e.target.value)}
                  placeholder="Let's try Free Demo:-"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5 sm:mb-2">
                  Demo Description
                </label>
                <Textarea
                  value={fields.demoDescription}
                  onChange={(e) => updateField('demoDescription', e.target.value)}
                  placeholder="Demo Panel Credentials (Try on Desktop or Laptop)"
                  rows={2}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5 sm:mb-2">
                  Demo URL
                </label>
                <Input
                  value={fields.demoURL}
                  onChange={(e) => updateField('demoURL', e.target.value)}
                  placeholder="https://troikaplus.io/premium/"
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5 sm:mb-2">
                    Demo Username
                  </label>
                  <Input
                    value={fields.demoUsername}
                    onChange={(e) => updateField('demoUsername', e.target.value)}
                    placeholder="premiumdemo"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5 sm:mb-2">
                    Demo Password
                  </label>
                  <Input
                    value={fields.demoPassword}
                    onChange={(e) => updateField('demoPassword', e.target.value)}
                    placeholder="TY_L8762025543210"
                    type="password"
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5 sm:mb-2">
                  Company Profile URL
                </label>
                <Input
                  value={fields.companyProfileURL}
                  onChange={(e) => updateField('companyProfileURL', e.target.value)}
                  placeholder="https://troikatech.in/company-profile/"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5 sm:mb-2">
                  Client List URL
                </label>
                <Input
                  value={fields.clientListURL}
                  onChange={(e) => updateField('clientListURL', e.target.value)}
                  placeholder="https://troikatech.in/brands/"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5 sm:mb-2">
                  FAQs URL
                </label>
                <Input
                  value={fields.faqsURL}
                  onChange={(e) => updateField('faqsURL', e.target.value)}
                  placeholder="https://troikatech.in/faqs/"
                  className="w-full"
                />
              </div>
            </div>
          )}

          {/* Footer Tab */}
          {activeTab === 'footer' && (
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5 sm:mb-2">
                  CTA Title
                </label>
                <Input
                  value={fields.ctaTitle}
                  onChange={(e) => updateField('ctaTitle', e.target.value)}
                  placeholder="Experience the Power of Instant Support..."
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5 sm:mb-2">
                  CTA Message
                </label>
                <Input
                  value={fields.ctaMessage}
                  onChange={(e) => updateField('ctaMessage', e.target.value)}
                  placeholder="Don't Wait, Start Promotion's Now!"
                  className="w-full"
                />
              </div>

              <div className="border-t pt-3 sm:pt-4">
                <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Footer Contact Information</h4>

                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5 sm:mb-2">
                      Footer Name
                    </label>
                    <Input
                      value={fields.footerName}
                      onChange={(e) => updateField('footerName', e.target.value)}
                      placeholder="Company Name"
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5 sm:mb-2">
                      Footer Phone
                    </label>
                    <Input
                      value={fields.footerPhone}
                      onChange={(e) => updateField('footerPhone', e.target.value)}
                      placeholder="☎️: 9821211755 | 9821211741"
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5 sm:mb-2">
                      Footer Email
                    </label>
                    <Input
                      value={fields.footerEmail}
                      onChange={(e) => updateField('footerEmail', e.target.value)}
                      placeholder="📧: info@troikatech.net"
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5 sm:mb-2">
                      Footer Website
                    </label>
                    <Input
                      value={fields.footerWebsite}
                      onChange={(e) => updateField('footerWebsite', e.target.value)}
                      placeholder="💻: https://troikatech.in"
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-3 sm:pt-4 border-t">
            <Button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Button onClick triggered');
                handleSave();
              }}
              disabled={saving}
              variant="primary"
              type="button"
              className="w-full sm:w-auto"
            >
              {saving ? 'Saving...' : 'Save Template'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="pb-3 sm:pb-4">
            <DialogTitle className="text-lg sm:text-xl">Edit Email Template Fields</DialogTitle>
            <DialogDescription className="text-sm">
              Edit or remove content from all template fields. Changes will be applied when you click "Apply Changes".
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 sm:space-y-6 py-2 sm:py-4">
            {/* Basic Information */}
            <div className="space-y-3 sm:space-y-4 border-b pb-3 sm:pb-4">
              <h3 className="font-semibold text-base sm:text-lg">Basic Information</h3>
              
              <div className="space-y-2 sm:space-y-3">
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-1.5 sm:mb-2">
                    <label className="block text-sm font-medium text-foreground">
                      Company Name
                    </label>
                    <Button
                      onClick={() => clearField('companyName')}
                      variant="ghost"
                      size="sm"
                      className="h-7 sm:h-6 px-2 text-red-600 hover:text-red-700 w-full sm:w-auto text-xs sm:text-sm"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  </div>
                  <Input
                    value={editFields.companyName || ''}
                    onChange={(e) => updateEditField('companyName', e.target.value)}
                    placeholder="Enter company name"
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-1.5 sm:mb-2">
                    <label className="block text-sm font-medium text-foreground">
                      Company Description
                    </label>
                    <Button
                      onClick={() => clearField('companyDescription')}
                      variant="ghost"
                      size="sm"
                      className="h-7 sm:h-6 px-2 text-red-600 hover:text-red-700 w-full sm:w-auto text-xs sm:text-sm"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  </div>
                  <Textarea
                    value={editFields.companyDescription || ''}
                    onChange={(e) => updateEditField('companyDescription', e.target.value)}
                    placeholder="Enter company description"
                    rows={3}
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-1.5 sm:mb-2">
                    <label className="block text-sm font-medium text-foreground">
                      Greeting Message
                    </label>
                    <Button
                      onClick={() => clearField('greetingMessage')}
                      variant="ghost"
                      size="sm"
                      className="h-7 sm:h-6 px-2 text-red-600 hover:text-red-700 w-full sm:w-auto text-xs sm:text-sm"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  </div>
                  <Textarea
                    value={editFields.greetingMessage || ''}
                    onChange={(e) => updateEditField('greetingMessage', e.target.value)}
                    placeholder="Hi, Thanks for the consideration..."
                    rows={2}
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-1.5 sm:mb-2">
                    <label className="block text-sm font-medium text-foreground">
                      Service Introduction
                    </label>
                    <Button
                      onClick={() => clearField('serviceIntroduction')}
                      variant="ghost"
                      size="sm"
                      className="h-7 sm:h-6 px-2 text-red-600 hover:text-red-700 w-full sm:w-auto text-xs sm:text-sm"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  </div>
                  <Textarea
                    value={editFields.serviceIntroduction || ''}
                    onChange={(e) => updateEditField('serviceIntroduction', e.target.value)}
                    placeholder="Introduction to services"
                    rows={2}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Services */}
            <div className="space-y-3 sm:space-y-4 border-b pb-3 sm:pb-4">
              <h3 className="font-semibold text-base sm:text-lg">Services</h3>
              
              <div className="space-y-2 sm:space-y-3">
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-1.5 sm:mb-2">
                    <label className="block text-sm font-medium text-foreground">
                      Service Benefits
                    </label>
                    <Button
                      onClick={() => clearField('serviceBenefits')}
                      variant="ghost"
                      size="sm"
                      className="h-7 sm:h-6 px-2 text-red-600 hover:text-red-700 w-full sm:w-auto text-xs sm:text-sm"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  </div>
                  <Textarea
                    value={editFields.serviceBenefits || ''}
                    onChange={(e) => updateEditField('serviceBenefits', e.target.value)}
                    placeholder="Why choose our services..."
                    rows={3}
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-1.5 sm:mb-2">
                    <label className="block text-sm font-medium text-foreground">
                      Free Panel Message
                    </label>
                    <Button
                      onClick={() => clearField('freePanelMessage')}
                      variant="ghost"
                      size="sm"
                      className="h-7 sm:h-6 px-2 text-red-600 hover:text-red-700 w-full sm:w-auto text-xs sm:text-sm"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  </div>
                  <Input
                    value={editFields.freePanelMessage || ''}
                    onChange={(e) => updateEditField('freePanelMessage', e.target.value)}
                    placeholder="You will get a Free Panel..."
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-1.5 sm:mb-2">
                    <label className="block text-sm font-medium text-foreground">
                      Retail Rate Message
                    </label>
                    <Button
                      onClick={() => clearField('retailRateMessage')}
                      variant="ghost"
                      size="sm"
                      className="h-7 sm:h-6 px-2 text-red-600 hover:text-red-700 w-full sm:w-auto text-xs sm:text-sm"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  </div>
                  <Input
                    value={editFields.retailRateMessage || ''}
                    onChange={(e) => updateEditField('retailRateMessage', e.target.value)}
                    placeholder="Retail Rate: 60 Paisa Per Message"
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-1.5 sm:mb-2">
                    <label className="block text-sm font-medium text-foreground">
                      Special Discount Message
                    </label>
                    <Button
                      onClick={() => clearField('specialDiscountMessage')}
                      variant="ghost"
                      size="sm"
                      className="h-7 sm:h-6 px-2 text-red-600 hover:text-red-700 w-full sm:w-auto text-xs sm:text-sm"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  </div>
                  <Textarea
                    value={editFields.specialDiscountMessage || ''}
                    onChange={(e) => updateEditField('specialDiscountMessage', e.target.value)}
                    placeholder="For any Quantity above 10 Lacs Messages..."
                    rows={2}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Pricing Plans */}
            <div className="space-y-3 sm:space-y-4 border-b pb-3 sm:pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                <h3 className="font-semibold text-base sm:text-lg">Pricing Plans</h3>
                <Button
                  onClick={() => clearField('pricingPlans')}
                  variant="ghost"
                  size="sm"
                  className="h-7 sm:h-6 px-2 text-red-600 hover:text-red-700 w-full sm:w-auto text-xs sm:text-sm"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear All
                </Button>
              </div>
              
              <div className="space-y-2 sm:space-y-3">
                {(editFields.pricingPlans || []).map((plan, index) => (
                  <Card key={index} className="p-2 sm:p-3">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 mb-2">
                      <h4 className="font-medium text-sm">Plan {index + 1}</h4>
                      <Button
                        onClick={() => removeEditPricingPlan(index)}
                        variant="ghost"
                        size="sm"
                        className="h-7 sm:h-6 px-2 text-red-600 hover:text-red-700 w-full sm:w-auto text-xs sm:text-sm"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Remove
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Input
                        value={plan.title || ''}
                        onChange={(e) => updateEditPricingPlan(index, 'title', e.target.value)}
                        placeholder="Plan Title"
                        className="text-sm w-full"
                      />
                      <Input
                        value={plan.price || ''}
                        onChange={(e) => updateEditPricingPlan(index, 'price', e.target.value)}
                        placeholder="Package Price"
                        className="text-sm w-full"
                      />
                      <Input
                        value={plan.rate || ''}
                        onChange={(e) => updateEditPricingPlan(index, 'rate', e.target.value)}
                        placeholder="Rate per Message"
                        className="text-sm w-full"
                      />
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* How It Works */}
            <div className="space-y-3 sm:space-y-4 border-b pb-3 sm:pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                <h3 className="font-semibold text-base sm:text-lg">How It Works</h3>
                <Button
                  onClick={() => clearField('howItWorksFeatures')}
                  variant="ghost"
                  size="sm"
                  className="h-7 sm:h-6 px-2 text-red-600 hover:text-red-700 w-full sm:w-auto text-xs sm:text-sm"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear All
                </Button>
              </div>
              
              <div className="space-y-2 sm:space-y-3">
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-1.5 sm:mb-2">
                    <label className="block text-sm font-medium text-foreground">
                      How It Works Title
                    </label>
                    <Button
                      onClick={() => clearField('howItWorksTitle')}
                      variant="ghost"
                      size="sm"
                      className="h-7 sm:h-6 px-2 text-red-600 hover:text-red-700 w-full sm:w-auto text-xs sm:text-sm"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  </div>
                  <Input
                    value={editFields.howItWorksTitle || ''}
                    onChange={(e) => updateEditField('howItWorksTitle', e.target.value)}
                    placeholder="How does our WhatsApp Marketing work?"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5 sm:mb-2">
                    Features
                  </label>
                  {(editFields.howItWorksFeatures || []).map((feature, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <Input
                        value={feature || ''}
                        onChange={(e) => updateEditFeature(index, e.target.value)}
                        placeholder={`Feature ${index + 1}`}
                        className="text-sm flex-1"
                      />
                      <Button
                        onClick={() => {
                          const newFeatures = [...(editFields.howItWorksFeatures || [])];
                          newFeatures[index] = '';
                          setEditFields(prev => ({ ...prev, howItWorksFeatures: newFeatures }));
                        }}
                        variant="ghost"
                        size="sm"
                        className="h-9 sm:h-9 px-2 text-red-600 hover:text-red-700 flex-shrink-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Demo Section */}
            <div className="space-y-3 sm:space-y-4 border-b pb-3 sm:pb-4">
              <h3 className="font-semibold text-base sm:text-lg">Demo Section</h3>
              
              <div className="space-y-2 sm:space-y-3">
                {[
                  { key: 'demoTitle', label: 'Demo Title', placeholder: "Let's try Free Demo:-" },
                  { key: 'demoDescription', label: 'Demo Description', placeholder: 'Demo Panel Credentials...', isTextarea: true },
                  { key: 'demoURL', label: 'Demo URL', placeholder: 'https://troikaplus.io/premium/' },
                  { key: 'demoUsername', label: 'Demo Username', placeholder: 'premiumdemo' },
                  { key: 'demoPassword', label: 'Demo Password', placeholder: 'TY_L8762025543210', type: 'password' },
                  { key: 'companyProfileURL', label: 'Company Profile URL', placeholder: 'https://troikatech.in/company-profile/' },
                  { key: 'clientListURL', label: 'Client List URL', placeholder: 'https://troikatech.in/brands/' },
                  { key: 'faqsURL', label: 'FAQs URL', placeholder: 'https://troikatech.in/faqs/' },
                ].map(({ key, label, placeholder, isTextarea, type }) => (
                  <div key={key}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-1.5 sm:mb-2">
                      <label className="block text-sm font-medium text-foreground">
                        {label}
                      </label>
                      <Button
                        onClick={() => clearField(key)}
                        variant="ghost"
                        size="sm"
                        className="h-7 sm:h-6 px-2 text-red-600 hover:text-red-700 w-full sm:w-auto text-xs sm:text-sm"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Clear
                      </Button>
                    </div>
                    {isTextarea ? (
                      <Textarea
                        value={editFields[key] || ''}
                        onChange={(e) => updateEditField(key, e.target.value)}
                        placeholder={placeholder}
                        rows={2}
                        className="w-full"
                      />
                    ) : (
                      <Input
                        value={editFields[key] || ''}
                        onChange={(e) => updateEditField(key, e.target.value)}
                        placeholder={placeholder}
                        type={type}
                        className="w-full"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Section */}
            <div className="space-y-3 sm:space-y-4">
              <h3 className="font-semibold text-base sm:text-lg">Footer Section</h3>
              
              <div className="space-y-2 sm:space-y-3">
                {[
                  { key: 'ctaTitle', label: 'CTA Title', placeholder: "Experience the Power of Instant Support..." },
                  { key: 'ctaMessage', label: 'CTA Message', placeholder: "Don't Wait, Start Promotion's Now!" },
                  { key: 'footerName', label: 'Footer Name', placeholder: 'Company Name' },
                  { key: 'footerPhone', label: 'Footer Phone', placeholder: '☎️: 9821211755 | 9821211741' },
                  { key: 'footerEmail', label: 'Footer Email', placeholder: '📧: info@troikatech.net' },
                  { key: 'footerWebsite', label: 'Footer Website', placeholder: '💻: https://troikatech.in' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-1.5 sm:mb-2">
                      <label className="block text-sm font-medium text-foreground">
                        {label}
                      </label>
                      <Button
                        onClick={() => clearField(key)}
                        variant="ghost"
                        size="sm"
                        className="h-7 sm:h-6 px-2 text-red-600 hover:text-red-700 w-full sm:w-auto text-xs sm:text-sm"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Clear
                      </Button>
                    </div>
                    <Input
                      value={editFields[key] || ''}
                      onChange={(e) => updateEditField(key, e.target.value)}
                      placeholder={placeholder}
                      className="w-full"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0 pt-3 sm:pt-4">
            <Button variant="outline" onClick={closeEditModal} className="w-full sm:w-auto order-2 sm:order-1">
              Cancel
            </Button>
            <Button onClick={saveEditChanges} variant="primary" className="w-full sm:w-auto order-1 sm:order-2">
              Apply Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmailTemplates;

