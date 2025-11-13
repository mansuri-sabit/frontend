// src/features/admin/pages/CreateClient.jsx - Refactored with Shadcn/UI, Framer Motion, and proper layout
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { apiClient } from '../../../lib/api';
import { useForm } from '../../../hooks/useForm';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Switch } from '../../../components/ui/Switch';
import { Label } from '../../../components/ui/label';
import { cn } from '../../../lib/utils';
import toast from '@/lib/toast';

function extractClientFromResponse(res) {
  const candidate = (res && (res.client || res.data || res)) || null;
  if (!candidate || typeof candidate !== 'object') return null;
  const id = candidate.id || candidate._id || candidate.client_id;
  return id ? { ...candidate, id } : null;
}

const CreateClient = () => {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [duplicateFields, setDuplicateFields] = useState(new Set());
  const [isValidating, setIsValidating] = useState(false);

  const {
    values,
    errors,
    handleChange,
    handleBlur,
    handleSubmit,
    isSubmitting,
    isValid,
    setFieldValue,
    setFieldError,
  } = useForm(
    {
      name: '',
      token_limit: 10000,
      contact_email: '',
      contact_phone: '',
      branding: {
        theme_color: '#3B82F6',
        welcome_message: 'Hello! How can I help you today?',
        pre_questions: [
          'What services do you offer?',
          'How can I contact support?',
          'What are your business hours?',
        ],
        logo_url: '',
        allow_embedding: true,
        show_powered_by: true,
      },
      owner_name: '',
      owner_username: '',
      owner_password: '',
      owner_email: '',
      owner_phone: '',
      owner_role: 'client',
    },
    {
      name: { required: true, minLength: 2, maxLength: 100 },
      token_limit: { required: true, type: 'number', min: 1000, max: 1000000 },
      contact_email: { 
        required: false, 
        type: 'email',
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        patternMessage: 'Please enter a valid email address'
      },
      contact_phone: { 
        required: false, 
        minLength: 10, 
        maxLength: 20,
        pattern: /^[\+]?[1-9][\d]{0,15}$/,
        patternMessage: 'Please enter a valid phone number'
      },
      owner_name: { required: true, minLength: 2, maxLength: 100 },
      owner_username: {
        required: true,
        minLength: 3,
        maxLength: 50,
        pattern: /^[a-zA-Z0-9_]+$/,
        patternMessage: 'Username can only contain letters, numbers, and underscores',
      },
      owner_password: { required: true, minLength: 8, maxLength: 128 },
      owner_email: { 
        required: true, 
        type: 'email',
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        patternMessage: 'Please enter a valid email address'
      },
      owner_phone: { 
        required: true, 
        minLength: 10, 
        maxLength: 20,
        pattern: /^[\+]?[1-9][\d]{0,15}$/,
        patternMessage: 'Please enter a valid phone number'
      },
      owner_role: { required: true },
    }
  );

  const handleRoleChange = (newRole) => {
    if (newRole === 'admin') {
      const confirm = window.confirm(
        '⚠️ WARNING: Admin role grants full system access.\n\n' +
        'This user will be able to:\n' +
        '• Manage all clients and users\n' +
        '• Access system settings\n' +
        '• View all data\n\n' +
        'Are you sure you want to proceed?'
      );
      if (!confirm) return;
    }
    setFieldValue('owner_role', newRole);
  };

  const validateDuplicates = async (formData) => {
    setIsValidating(true);
    try {
      const clientPayload = {
        name: formData.name,
        token_limit: Number(formData.token_limit),
        contact_email: formData.contact_email || '',
        contact_phone: formData.contact_phone || '',
        branding: {
          logo_url: formData.branding.logo_url,
          theme_color: formData.branding.theme_color,
          welcome_message: formData.branding.welcome_message,
          allow_embedding: !!formData.branding.allow_embedding,
          pre_questions: (formData.branding.pre_questions || [])
            .map((q) => (q || '').trim())
            .filter(Boolean)
            .slice(0, 3),
        },
        initial_user: {
          username: formData.owner_username,
          password: formData.owner_password,
          name: formData.owner_name,
          email: formData.owner_email,
          phone: formData.owner_phone,
          role: formData.owner_role,
        },
      };

      await apiClient.validateClient(clientPayload);
      setDuplicateFields(new Set());
      ['name', 'contact_email', 'contact_phone', 'owner_username', 'owner_email', 'owner_phone'].forEach((field) => {
        if (errors[field] === 'This value already exists') {
          setFieldError(field, null);
        }
      });
      return { valid: true, duplicateFields: [] };
    } catch (err) {
      const status = err?.status || err?.response?.status;
      const errorData = err?.response?.data || err?.data || {};
      
      if (status === 409 && errorData.fields) {
        const duplicateFieldSet = new Set(errorData.fields);
        setDuplicateFields(duplicateFieldSet);
        toast.warning('⚠️ This value already exists, please try a different one.');
        errorData.fields.forEach((field) => {
          setFieldError(field, 'This value already exists');
        });
        return { valid: false, duplicateFields: errorData.fields };
      }
      
      setDuplicateFields(new Set());
      return { valid: true, duplicateFields: [] };
    } finally {
      setIsValidating(false);
    }
  };

  const handleChangeWithValidation = (e) => {
    const fieldName = e.target.name;
    if (duplicateFields.has(fieldName)) {
      setDuplicateFields((prev) => {
        const newSet = new Set(prev);
        newSet.delete(fieldName);
        return newSet;
      });
      setFieldError(fieldName, null);
    }
    handleChange(e);
  };

  const handleFieldBlur = async (e) => {
    const fieldName = e.target.name;
    const fieldValue = e.target.value;
    handleBlur(e);
    
    if (!fieldValue || fieldValue.trim() === '') {
      return;
    }

    if (values.name && values.owner_username && values.owner_email && values.owner_phone) {
      await validateDuplicates(values);
    }
  };

  const onSubmit = handleSubmit(async (formData) => {
    setIsCreating(true);
    try {
      const clientPayload = {
        name: formData.name,
        token_limit: Number(formData.token_limit),
        contact_email: formData.contact_email || '',
        contact_phone: formData.contact_phone || '',
        branding: {
          logo_url: formData.branding.logo_url,
          theme_color: formData.branding.theme_color,
          welcome_message: formData.branding.welcome_message,
          allow_embedding: !!formData.branding.allow_embedding,
          pre_questions: (formData.branding.pre_questions || [])
            .map((q) => (q || '').trim())
            .filter(Boolean)
            .slice(0, 3),
        },
        initial_user: {
          username: formData.owner_username,
          password: formData.owner_password,
          name: formData.owner_name,
          email: formData.owner_email,
          phone: formData.owner_phone,
          role: formData.owner_role,
        },
      };

      const validationResult = await validateDuplicates(formData);
      if (!validationResult.valid) {
        setIsCreating(false);
        return;
      }

      let createdRaw;
      try {
        createdRaw = await apiClient.createClient(clientPayload);
      } catch (err) {
        const status = err?.status || err?.response?.status;
        const errorData = err?.response?.data || err?.data || {};
        
        if (status === 409) {
          if (errorData.fields && Array.isArray(errorData.fields)) {
            const duplicateFieldSet = new Set(errorData.fields);
            setDuplicateFields(duplicateFieldSet);
            errorData.fields.forEach((field) => {
              setFieldError(field, 'This value already exists');
            });
          }
          toast.warning('⚠️ This value already exists, please try a different one.');
          return;
        }
        throw err;
      }

      const createdClient = extractClientFromResponse(createdRaw);
      if (!createdClient?.id) {
        throw new Error('Client created but no id returned from server.');
      }

      toast.success(
        `Client "${createdClient.name || formData.name}" created successfully with ${formData.owner_role} user!`
      );

      navigate('/admin', { replace: true });
    } catch (error) {
      console.error('❌ Failed to create client:', error);
      toast.error(`Failed to create client: ${error.message || 'Unknown error'}`);
    } finally {
      setIsCreating(false);
    }
  });

  const updatePreQuestion = (index, value) => {
    const arr = [...(values.branding.pre_questions || [])];
    arr[index] = value;
    setFieldValue('branding', { ...values.branding, pre_questions: arr });
  };

  const addPreQuestion = () => {
    const current = values.branding.pre_questions || [];
    if (current.length < 3) {
      setFieldValue('branding', {
        ...values.branding,
        pre_questions: [...current, ''],
      });
    }
  };

  const removePreQuestion = (index) => {
    const arr = (values.branding.pre_questions || []).filter((_, i) => i !== index);
    setFieldValue('branding', { ...values.branding, pre_questions: arr });
  };

  const formatTokenLimit = (value) =>
    new Intl.NumberFormat('en-US').format(Number(value || 0));

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
      },
    },
  };

  return (
    <div className="min-h-screen bg-background py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-foreground">Create New Client</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Set up a new client tenant and the first login user in one step.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </motion.div>

        <form onSubmit={onSubmit} className="space-y-6" noValidate>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {/* Tenant Details */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle>Tenant Details</CardTitle>
                  <CardDescription>
                    Basic information about the client tenant
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">
                        Client Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        placeholder="Acme Corp"
                        value={values.name}
                        onChange={handleChangeWithValidation}
                        onBlur={handleFieldBlur}
                        className={cn(
                          errors.name || duplicateFields.has('name') ? 'border-destructive' : ''
                        )}
                      />
                      {(errors.name || duplicateFields.has('name')) && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {errors.name || 'This value already exists'}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="token_limit">
                        Token Limit <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="token_limit"
                        name="token_limit"
                        type="number"
                        placeholder="10000"
                        value={values.token_limit}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        min="1000"
                        max="1000000"
                        step="1000"
                        className={cn(
                          errors.token_limit ? 'border-destructive' : ''
                        )}
                      />
                      {errors.token_limit && (
                        <p className="text-sm text-destructive">{errors.token_limit}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Formatted: {formatTokenLimit(values.token_limit)} tokens
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contact_email">Contact Email</Label>
                      <Input
                        id="contact_email"
                        name="contact_email"
                        type="email"
                        placeholder="contact@example.com"
                        value={values.contact_email}
                        onChange={handleChangeWithValidation}
                        onBlur={handleFieldBlur}
                        className={cn(
                          errors.contact_email || duplicateFields.has('contact_email') ? 'border-destructive' : ''
                        )}
                      />
                      {(errors.contact_email || duplicateFields.has('contact_email')) && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {errors.contact_email || 'This value already exists'}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contact_phone">Contact Phone</Label>
                      <Input
                        id="contact_phone"
                        name="contact_phone"
                        placeholder="+1 555 123 4567"
                        value={values.contact_phone}
                        onChange={handleChangeWithValidation}
                        onBlur={handleFieldBlur}
                        className={cn(
                          errors.contact_phone || duplicateFields.has('contact_phone') ? 'border-destructive' : ''
                        )}
                      />
                      {(errors.contact_phone || duplicateFields.has('contact_phone')) && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {errors.contact_phone || 'This value already exists'}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Branding Configuration */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle>Branding Configuration</CardTitle>
                  <CardDescription>
                    Customize the chat widget appearance and behavior
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="theme_color">Theme Color</Label>
                      <div className="flex items-center gap-3">
                        <Input
                          id="theme_color"
                          type="color"
                          value={values.branding.theme_color}
                          onChange={(e) =>
                            setFieldValue('branding', {
                              ...values.branding,
                              theme_color: e.target.value,
                            })
                          }
                          className="w-20 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={values.branding.theme_color}
                          onChange={(e) =>
                            setFieldValue('branding', {
                              ...values.branding,
                              theme_color: e.target.value,
                            })
                          }
                          placeholder="#3B82F6"
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="logo_url">Logo URL (Optional)</Label>
                      <Input
                        id="logo_url"
                        placeholder="https://example.com/logo.png"
                        value={values.branding.logo_url}
                        onChange={(e) =>
                          setFieldValue('branding', {
                            ...values.branding,
                            logo_url: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="welcome_message">
                      Welcome Message <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="welcome_message"
                      placeholder="Enter the greeting message for the chat widget"
                      value={values.branding.welcome_message}
                      onChange={(e) =>
                        setFieldValue('branding', {
                          ...values.branding,
                          welcome_message: e.target.value,
                        })
                      }
                      rows={3}
                      maxLength={500}
                      showCharCount
                      required
                    />
                  </div>

                  {/* Pre-defined Questions */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Pre-defined Questions (max 3)</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addPreQuestion}
                        disabled={(values.branding.pre_questions || []).length >= 3}
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add Question
                      </Button>
                    </div>

                    <AnimatePresence>
                      {(values.branding.pre_questions || []).map((q, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ duration: 0.2 }}
                          className="flex gap-2"
                        >
                          <Input
                            placeholder={`Question ${idx + 1}`}
                            value={q}
                            onChange={(e) => updatePreQuestion(idx, e.target.value)}
                            className="flex-1"
                            maxLength={100}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removePreQuestion(idx)}
                            className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive px-3"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
                    <Switch
                      label="Allow Widget Embedding"
                      description="Enable embedding the chat widget on external websites"
                      checked={values.branding.allow_embedding}
                      onChange={(checked) =>
                        setFieldValue('branding', {
                          ...values.branding,
                          allow_embedding: checked,
                        })
                      }
                    />
                    <Switch
                      label="Show 'Powered by'"
                      description="Display powered by branding in the widget"
                      checked={values.branding.show_powered_by}
                      onChange={(checked) =>
                        setFieldValue('branding', {
                          ...values.branding,
                          show_powered_by: checked,
                        })
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Initial User */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle>Initial User (Client Owner)</CardTitle>
                  <CardDescription>
                    This user will be created automatically when the client is set up.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="owner_name">
                        Full Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="owner_name"
                        name="owner_name"
                        placeholder="Jane Doe"
                        value={values.owner_name}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={cn(
                          errors.owner_name ? 'border-destructive' : ''
                        )}
                      />
                      {errors.owner_name && (
                        <p className="text-sm text-destructive">{errors.owner_name}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="owner_username">
                        Username <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="owner_username"
                        name="owner_username"
                        placeholder="acme_owner"
                        value={values.owner_username}
                        onChange={handleChangeWithValidation}
                        onBlur={handleFieldBlur}
                        className={cn(
                          errors.owner_username || duplicateFields.has('owner_username') ? 'border-destructive' : ''
                        )}
                      />
                      {(errors.owner_username || duplicateFields.has('owner_username')) && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {errors.owner_username || 'This value already exists'}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="owner_password">
                        Password <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="owner_password"
                        name="owner_password"
                        type="password"
                        placeholder="Enter secure password"
                        value={values.owner_password}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={cn(
                          errors.owner_password ? 'border-destructive' : ''
                        )}
                      />
                      {errors.owner_password && (
                        <p className="text-sm text-destructive">{errors.owner_password}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="owner_role">
                        User Role <span className="text-destructive">*</span>
                      </Label>
                      <select
                        id="owner_role"
                        name="owner_role"
                        value={values.owner_role}
                        onChange={(e) => handleRoleChange(e.target.value)}
                        onBlur={handleBlur}
                        className={cn(
                          "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors",
                          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                          "disabled:cursor-not-allowed disabled:opacity-50",
                          errors.owner_role ? 'border-destructive' : ''
                        )}
                      >
                        <option value="client">🏢 Client - Full client dashboard access</option>
                        <option value="admin">⚠️ Admin - System administrator access</option>
                      </select>
                      {errors.owner_role && (
                        <p className="text-sm text-destructive">{errors.owner_role}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="owner_email">
                        Email <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="owner_email"
                        name="owner_email"
                        type="email"
                        placeholder="jane@example.com"
                        value={values.owner_email}
                        onChange={handleChangeWithValidation}
                        onBlur={handleFieldBlur}
                        className={cn(
                          errors.owner_email || duplicateFields.has('owner_email') ? 'border-destructive' : ''
                        )}
                      />
                      {(errors.owner_email || duplicateFields.has('owner_email')) && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {errors.owner_email || 'This value already exists'}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="owner_phone">
                        Phone <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="owner_phone"
                        name="owner_phone"
                        placeholder="+1 555 123 4567"
                        value={values.owner_phone}
                        onChange={handleChangeWithValidation}
                        onBlur={handleFieldBlur}
                        className={cn(
                          errors.owner_phone || duplicateFields.has('owner_phone') ? 'border-destructive' : ''
                        )}
                      />
                      {(errors.owner_phone || duplicateFields.has('owner_phone')) && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {errors.owner_phone || 'This value already exists'}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Actions */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardContent className="flex justify-end gap-3 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/admin')}
                    disabled={isCreating || isValidating}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={!isValid || isCreating || isValidating}
                  >
                    {isValidating || isCreating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {isValidating ? 'Validating...' : 'Creating Client...'}
                      </>
                    ) : (
                      'Create Client & User'
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </form>
      </div>
    </div>
  );
};

export { CreateClient };
export default CreateClient;
