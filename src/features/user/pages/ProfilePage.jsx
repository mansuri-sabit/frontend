import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { apiClient } from '../../../lib/api';
import { Card, CardContent, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import toast from '@/lib/toast';
import { Avatar } from '../../../components/ui/Avatar';
import { Badge } from '../../../components/ui/Badge';

const ProfilePage = () => {
  const { user, updateUser } = useAuthStore();
  
  // State
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(0); // Track avatar updates for cache-busting
  const [profileData, setProfileData] = useState({
    username: '',
    name: '',
    email: '',
    phone: '',
    avatar_url: '',
  });

  // Load profile data
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setIsLoading(true);
        const response = await apiClient.getProfile();
        setProfileData({
          username: response.username || '',
          name: response.name || '',
          email: response.email || '',
          phone: response.phone || '',
          avatar_url: response.avatar_url || '',
        });
      } catch (error) {
        console.error('Error loading profile:', error);
        toast.error('Failed to load profile data');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [toast]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle avatar upload
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please select a valid image file (JPEG, PNG, GIF, WebP)');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    try {
      setIsUploading(true);
      const response = await apiClient.uploadAvatar(file);
      
      // Update profile data with new avatar URL
      setProfileData(prev => ({
        ...prev,
        avatar_url: response.avatar_url
      }));
      
      // Increment avatar version to force cache refresh
      setAvatarVersion(prev => prev + 1);
      
      // Update user in auth store
      updateUser({ avatar_url: response.avatar_url });
      
      // Reload profile data to ensure consistency
      try {
        const profileResponse = await apiClient.getProfile();
        setProfileData({
          username: profileResponse.username || '',
          name: profileResponse.name || '',
          email: profileResponse.email || '',
          phone: profileResponse.phone || '',
          avatar_url: profileResponse.avatar_url || '',
        });
        
        // Update auth store with latest profile data (including avatar)
        updateUser({
          ...profileResponse,
          avatar_url: profileResponse.avatar_url,
        });
      } catch (error) {
        console.warn('Failed to reload profile data:', error);
      }
      
      toast.success('Avatar uploaded successfully');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error(error.response?.data?.message || 'Failed to upload avatar');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setIsSaving(true);
      const response = await apiClient.updateProfile(profileData);
      
      // Update user in auth store
      updateUser(response.user);
      
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage your account information and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Preview */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Profile Preview</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <Avatar 
                    key={`avatar-${avatarVersion}-${profileData.avatar_url}`}
                    size="xl" 
                    name={profileData.name || profileData.username}
                    src={profileData.avatar_url}
                    className="w-24 h-24"
                  />
                  <label className="absolute bottom-0 right-0 bg-primary-600 text-white rounded-full p-2 cursor-pointer hover:bg-primary-700 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      disabled={isUploading}
                      className="hidden"
                    />
                    {isUploading ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </label>
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {profileData.name || 'No name set'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    @{profileData.username || 'No username'}
                  </p>
                  <Badge variant="outline" className="mt-2">
                    {user?.role || 'Unknown role'}
                  </Badge>
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Email:</span>
                    <span className="text-gray-900 dark:text-white">
                      {profileData.email || 'Not provided'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Phone:</span>
                    <span className="text-gray-900 dark:text-white">
                      {profileData.phone || 'Not provided'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Profile Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Edit Profile</h2>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Username"
                    name="username"
                    value={profileData.username}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter your username"
                  />
                  <Input
                    label="Full Name"
                    name="name"
                    value={profileData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter your full name"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Email"
                    name="email"
                    type="email"
                    value={profileData.email}
                    onChange={handleInputChange}
                    placeholder="Enter your email"
                  />
                  <Input
                    label="Phone"
                    name="phone"
                    value={profileData.phone}
                    onChange={handleInputChange}
                    placeholder="Enter your phone number"
                  />
                </div>

                <div className="flex justify-end space-x-4">
                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="min-w-[120px]"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
