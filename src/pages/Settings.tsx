import React, { useState, useEffect } from 'react';
import { Button } from '../components/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/components/ui/dialog';
import { Label } from '../components/components/ui/label';
import { Trash2, Plus, Edit2, Save, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SettingItem {
  id?: string;
  name?: string;
  code?: string;
  value: string;
  label: string;
  numericValue?: number;
  color?: string;
}

interface SettingCategory {
  key: string;
  title: string;
  items: SettingItem[];
  hasCode?: boolean;
  hasNumericValue?: boolean;
  hasColor?: boolean;
  hasName?: boolean;
}

const Settings: React.FC = () => {
  const [categories, setCategories] = useState<SettingCategory[]>([]);
  const [editingItem, setEditingItem] = useState<{
    categoryKey: string;
    item: SettingItem;
    isNew: boolean;
  } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .order('category', { ascending: true })
        .order('sort_order', { ascending: true });

      if (error) throw error;

      // Group settings by category
      const grouped =
        data?.reduce((acc: Record<string, SettingItem[]>, setting) => {
          if (!acc[setting.category]) {
            acc[setting.category] = [];
          }
          acc[setting.category].push({
            id: setting.id,
            name: setting.name,
            code: setting.code,
            value: setting.value,
            label: setting.label,
            numericValue: setting.numeric_value,
            color: setting.color,
          });
          return acc;
        }, {}) || {};

      const categoryConfigs = [
        {
          key: 'work_types',
          title: 'Work Types',
          hasCode: true,
          hasName: true,
        },
        { key: 'order_statuses_sale', title: 'Sale Order Statuses' },
        { key: 'order_statuses_work', title: 'Work Order Statuses' },
        { key: 'cities', title: 'Egyptian Cities' },
        { key: 'material_types', title: 'Material Types' },
        { key: 'units', title: 'Units' },
        { key: 'engineers', title: 'Engineers' },
        { key: 'work_order_stages', title: 'Work Order Stages' },
        {
          key: 'employee_rates',
          title: 'Employee Rates',
          hasNumericValue: true,
        },
        { key: 'stage_statuses', title: 'Stage Statuses', hasColor: true },
      ];

      const categoriesData = categoryConfigs.map((config) => ({
        ...config,
        items: grouped[config.key] || [],
      }));

      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSaveItem = async () => {
    if (!editingItem) return;

    try {
      const settingData = {
        category: editingItem.categoryKey,
        name: editingItem.item.name || null,
        code: editingItem.item.code || null,
        value: editingItem.item.value,
        label: editingItem.item.label,
        numeric_value: editingItem.item.numericValue || null,
        color: editingItem.item.color || null,
        sort_order: editingItem.isNew ? 999 : undefined,
      };

      if (editingItem.isNew) {
        const { error } = await supabase
          .from('app_settings')
          .insert([settingData]);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('app_settings')
          .update(settingData)
          .eq('id', editingItem.item.id);
        if (error) throw error;
      }

      setIsDialogOpen(false);
      setEditingItem(null);
      loadSettings();
    } catch (error) {
      console.error('Error saving setting:', error);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const { error } = await supabase
        .from('app_settings')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      loadSettings();
    } catch (error) {
      console.error('Error deleting setting:', error);
    }
  };

  const openEditDialog = (
    categoryKey: string,
    item: SettingItem,
    isNew = false
  ) => {
    setEditingItem({ categoryKey, item, isNew });
    setIsDialogOpen(true);
  };

  const getCategoryConfig = (categoryKey: string) => {
    return categories.find((c) => c.key === categoryKey);
  };

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      <div className="grid gap-8">
        {categories.map((category) => (
          <div key={category.key} className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">{category.title}</h2>
              <Button
                onClick={() =>
                  openEditDialog(
                    category.key,
                    {
                      value: '',
                      label: '',
                      ...(category.hasName && { name: '' }),
                      ...(category.hasCode && { code: '' }),
                      ...(category.hasNumericValue && { numericValue: 1 }),
                      ...(category.hasColor && { color: 'gray' }),
                    },
                    true
                  )
                }
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New
              </Button>
            </div>

            <div className="space-y-2">
              {category.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    {category.hasCode && item.code && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-mono">
                        {item.code}
                      </span>
                    )}
                    {category.hasColor && item.color && (
                      <div
                        className={`w-4 h-4 rounded-full bg-${item.color}-500`}
                      ></div>
                    )}
                    <div>
                      <span className="font-medium">{item.label}</span>
                      {category.hasName && item.name && (
                        <span className="text-gray-500 ml-2">
                          ({item.name})
                        </span>
                      )}
                      {category.hasNumericValue && item.numericValue && (
                        <span className="text-gray-500 ml-2">
                          ({item.numericValue}x)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(category.key, item)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteItem(item.id!)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingItem?.isNew ? 'Add New' : 'Edit'}{' '}
              {getCategoryConfig(editingItem?.categoryKey || '')?.title}
            </DialogTitle>
          </DialogHeader>

          {editingItem && (
            <div className="space-y-4">
              {getCategoryConfig(editingItem.categoryKey)?.hasName && (
                <div>
                  <Label htmlFor="name">Name</Label>
                  <input
                    id="name"
                    type="text"
                    value={editingItem.item.name || ''}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        item: { ...editingItem.item, name: e.target.value },
                      })
                    }
                    className="w-full p-2 border rounded-md"
                  />
                </div>
              )}

              {getCategoryConfig(editingItem.categoryKey)?.hasCode && (
                <div>
                  <Label htmlFor="code">Code</Label>
                  <input
                    id="code"
                    type="text"
                    value={editingItem.item.code || ''}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        item: { ...editingItem.item, code: e.target.value },
                      })
                    }
                    className="w-full p-2 border rounded-md"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="value">Value</Label>
                <input
                  id="value"
                  type="text"
                  value={editingItem.item.value}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      item: { ...editingItem.item, value: e.target.value },
                    })
                  }
                  className="w-full p-2 border rounded-md"
                />
              </div>

              <div>
                <Label htmlFor="label">Label</Label>
                <input
                  id="label"
                  type="text"
                  value={editingItem.item.label}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      item: { ...editingItem.item, label: e.target.value },
                    })
                  }
                  className="w-full p-2 border rounded-md"
                />
              </div>

              {getCategoryConfig(editingItem.categoryKey)?.hasNumericValue && (
                <div>
                  <Label htmlFor="numericValue">Numeric Value</Label>
                  <input
                    id="numericValue"
                    type="number"
                    step="0.1"
                    value={editingItem.item.numericValue || ''}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        item: {
                          ...editingItem.item,
                          numericValue: parseFloat(e.target.value),
                        },
                      })
                    }
                    className="w-full p-2 border rounded-md"
                  />
                </div>
              )}

              {getCategoryConfig(editingItem.categoryKey)?.hasColor && (
                <div>
                  <Label htmlFor="color">Color</Label>
                  <select
                    id="color"
                    value={editingItem.item.color || ''}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        item: { ...editingItem.item, color: e.target.value },
                      })
                    }
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="gray">Gray</option>
                    <option value="blue">Blue</option>
                    <option value="green">Green</option>
                    <option value="red">Red</option>
                    <option value="yellow">Yellow</option>
                    <option value="purple">Purple</option>
                    <option value="pink">Pink</option>
                  </select>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSaveItem}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Settings;
