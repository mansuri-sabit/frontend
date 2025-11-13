// src/features/admin/components/CreateClientForm.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Card } from '../../../components/ui/Card';
import { apiClient } from '../../../lib/api';
import toast from '@/lib/toast';

export const CreateClientForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    token_limit: 50000,
    branding: {
      logo_url: '',
      theme_color: '#3B82F6',
      welcome_message: 'Hello! How can I help you today?',
      pre_questions: [''],
      allow_embedding: true
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      // Clean up pre_questions
      const cleanedData = {
        ...formData,
        branding: {
          ...formData.branding,
          pre_questions: formData.branding.pre_questions.filter(q => q.trim())
        }
      };

      const result = await apiClient.createClient(cleanedData);
      toast.success(`Client "${result.name}" created successfully!`);
      navigate('/admin/clients');
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field, value, nested = null) => {
    if (nested) {
      setFormData(prev => ({
        ...prev,
        [nested]: {
          ...prev[nested],
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }

    // Clear errors
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handlePreQuestionChange = (index, value) => {
    const newQuestions = [...formData.branding.pre_questions];
    newQuestions[index] = value;
    handleChange('pre_questions', newQuestions, 'branding');
  };

  const addPreQuestion = () => {
    if (formData.branding.pre_questions.length < 3) {
      handleChange(
        'pre_questions', 
        [...formData.branding.pre_questions, ''], 
        'branding'
      );
    }
  };

  const removePreQuestion = (index) => {
    const newQuestions = formData.branding.pre_questions.filter((_, i) => i !== index);
    handleChange('pre_questions', newQuestions, 'branding');
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="p-6">
        <h1 className="text-3xl font-bold mb-8">Create New Client Tenant</h1>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Basic Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Client Name"
                name="name"
                required
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                error={errors.name}
                placeholder="Acme Corporation"
              />
              
              <Input
                label="Token Limit"
                name="token_limit"
                type="number"
                required
                min="1000"
                value={formData.token_limit}
                onChange={(e) => handleChange('token_limit', parseInt(e.target.value))}
                error={errors.token_limit}
                help="Monthly token allocation for AI responses"
              />
            </div>
          </div>

          {/* Branding */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Branding & Configuration</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Logo URL"
                name="logo_url"
                type="url"
                value={formData.branding.logo_url}
                onChange={(e) => handleChange('logo_url', e.target.value, 'branding')}
                placeholder="https://example.com/logo.png"
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Theme Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={formData.branding.theme_color}
                    onChange={(e) => handleChange('theme_color', e.target.value, 'branding')}
                    className="h-10 w-20 rounded border border-gray-300"
                  />
                  <Input
                    type="text"
                    value={formData.branding.theme_color}
                    onChange={(e) => handleChange('theme_color', e.target.value, 'branding')}
                    placeholder="#3B82F6"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            
            <Input
              label="Welcome Message"
              name="welcome_message"
              as="textarea"
              rows={3}
              value={formData.branding.welcome_message}
              onChange={(e) => handleChange('welcome_message', e.target.value, 'branding')}
              placeholder="Hello! How can I help you today?"
            />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pre-Questions (Max 3)
              </label>
              <div className="space-y-2">
                {formData.branding.pre_questions.map((question, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      value={question}
                      onChange={(e) => handlePreQuestionChange(index, e.target.value)}
                      placeholder={`Question ${index + 1}`}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removePreQuestion(index)}
                      className="text-red-600"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                {formData.branding.pre_questions.length < 3 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addPreQuestion}
                    className="w-full"
                  >
                    Add Question
                  </Button>
                )}
              </div>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="allow_embedding"
                checked={formData.branding.allow_embedding}
                onChange={(e) => handleChange('allow_embedding', e.target.checked, 'branding')}
                className="h-4 w-4 text-primary-600 rounded"
              />
              <label htmlFor="allow_embedding" className="ml-2 text-sm text-gray-700">
                Allow embedding on external websites
              </label>
            </div>
          </div>

          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600">{errors.submit}</p>
            </div>
          )}

          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/admin')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
            >
              {isLoading ? 'Creating...' : 'Create Client'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
