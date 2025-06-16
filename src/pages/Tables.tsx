import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ChevronDown, ChevronRight, RefreshCw, Database, Users } from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

interface ColumnInfo {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
}
interface RelationInfo {
  table_name: string;
  column_name: string;
  foreign_table_name: string;
  foreign_column_name: string;
}

interface AuthUser {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
  last_sign_in_at: string;
  email_confirmed_at: string;
  phone: string;
  confirmed_at: string;
  role: string;
  aud: string;
}

const Tables: React.FC = () => {
  const [tables, setTables] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [tableData, setTableData] = useState<Record<string, any[]>>({});
  const [schemaInfo, setSchemaInfo] = useState<Record<string, ColumnInfo[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState<Record<string, boolean>>({});
  const [tableOffsets, setTableOffsets] = useState<Record<string, number>>({});
  const [hasMore, setHasMore] = useState<Record<string, boolean>>({});
  const [relations, setRelations] = useState<Record<string, RelationInfo[]>>({});
  const [authUsers, setAuthUsers] = useState<AuthUser[]>([]);
  const [authUsersExpanded, setAuthUsersExpanded] = useState(false);
  const [authUsersLoading, setAuthUsersLoading] = useState(false);

  const fetchTables = async () => { 
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('list_table_schema');
      if (error) throw error;

      // Group schema info by table
      const schemaByTable = data.reduce((acc: Record<string, ColumnInfo[]>, row: ColumnInfo) => {
        if (!acc[row.table_name]) {
          acc[row.table_name] = [];
        }
        acc[row.table_name].push(row);
        return acc;
      }, {});

      // Get unique table names
      const tableNames = Object.keys(schemaByTable);
      setTables(tableNames);
      setSchemaInfo(schemaByTable);

      // Initialize offsets and hasMore for all tables
      const initialOffsets: Record<string, number> = {};
      const initialHasMore: Record<string, boolean> = {};
      tableNames.forEach((table: string) => {
        initialOffsets[table] = 0;
        initialHasMore[table] = true;
        if (!expanded[table]) {
          setExpanded(prev => ({ ...prev, [table]: false }));
        }
      });
      setTableOffsets(initialOffsets);
      setHasMore(initialHasMore);
    } catch (err) {
      console.error('Failed to fetch schema information:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to get the best column to order by
  const getOrderColumn = (tableName: string): string => {
    const columns = schemaInfo[tableName]?.map(col => col.column_name) || [];
    if (columns.includes('created_at')) return 'created_at';
    if (columns.includes('id')) return 'id';
    return columns[0] || '*';
  };

  const fetchTableData = async (tableName: string, offset: number = 0) => {
    try {
      setLoadingMore(prev => ({ ...prev, [tableName]: true }));
      const orderColumn = getOrderColumn(tableName);
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact' })
        .order(orderColumn, { ascending: false })
        .range(offset, offset + 49); // Fetch 50 records at a time

      if (error) throw error;
      
      // Update table data
      setTableData(prev => ({
        ...prev,
        [tableName]: offset === 0 ? data : [...(prev[tableName] || []), ...data]
      }));

      // Update hasMore flag
      setHasMore(prev => ({
        ...prev,
        [tableName]: (offset + 50) < (count || 0)
      }));

      // Update offset
      setTableOffsets(prev => ({
        ...prev,
        [tableName]: offset + 50
      }));
    } catch (err) {
      console.error(`Error fetching data for ${tableName}:`, err);
    } finally {
      setLoadingMore(prev => ({ ...prev, [tableName]: false }));
    }
  };

  const fetchAuthUsers = async () => {
    try {
      setAuthUsersLoading(true);
      
      // Fetch auth users using the admin API
      const { data, error } = await supabase.auth.admin.listUsers();
      
      if (error) {
        console.error('Error fetching auth users:', error);
        // Fallback: try to get current user info
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setAuthUsers([user as any]);
        }
      } else {
        setAuthUsers(data.users as any);
      }
    } catch (err) {
      console.error('Failed to fetch auth users:', err);
      // Try alternative approach - get current session user
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setAuthUsers([user as any]);
        }
      } catch (sessionErr) {
        console.error('Failed to get current user:', sessionErr);
      }
    } finally {
      setAuthUsersLoading(false);
    }
  };
  
  const fetchRelations = async () => {
    try {
      const { data, error } = await supabase.rpc('get_foreign_key_relationships');
      console.log('RELATION DATA:', data, 'ERROR:', error); // 👈 Add this
  
      if (error) throw error;
  
      const grouped = data.reduce((acc: Record<string, RelationInfo[]>, rel: RelationInfo) => {
        if (!acc[rel.table_name]) acc[rel.table_name] = [];
        acc[rel.table_name].push(rel);
        return acc;
      }, {});
      setRelations(grouped);
    } catch (err) {
      console.error('Failed to fetch relations:', err);
    }
  };
  
  const loadMore = async (tableName: string) => {
    const currentOffset = tableOffsets[tableName] || 0;
    await fetchTableData(tableName, currentOffset);
  };

  const toggleTable = async (tableName: string) => {
    setExpanded(prev => {
      const newExpanded = { ...prev, [tableName]: !prev[tableName] };
      if (newExpanded[tableName] && !tableData[tableName]) {
        fetchTableData(tableName, 0);
      }
      return newExpanded;
    });
  };

  const toggleAuthUsers = async () => {
    setAuthUsersExpanded(prev => {
      const newExpanded = !prev;
      if (newExpanded && authUsers.length === 0) {
        fetchAuthUsers();
      }
      return newExpanded;
    });
  };

  useEffect(() => {
    fetchTables();
    fetchRelations();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Define auth users schema for display
  const authUsersSchema = [
    { column_name: 'id', data_type: 'uuid', is_nullable: 'NO' },
    { column_name: 'email', data_type: 'text', is_nullable: 'YES' },
    { column_name: 'created_at', data_type: 'timestamp with time zone', is_nullable: 'YES' },
    { column_name: 'updated_at', data_type: 'timestamp with time zone', is_nullable: 'YES' },
    { column_name: 'last_sign_in_at', data_type: 'timestamp with time zone', is_nullable: 'YES' },
    { column_name: 'email_confirmed_at', data_type: 'timestamp with time zone', is_nullable: 'YES' },
    { column_name: 'phone', data_type: 'text', is_nullable: 'YES' },
    { column_name: 'confirmed_at', data_type: 'timestamp with time zone', is_nullable: 'YES' },
    { column_name: 'role', data_type: 'text', is_nullable: 'YES' },
    { column_name: 'aud', data_type: 'text', is_nullable: 'YES' },
  ];

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-7xl">
      {/* Schema Overview Section */}
      <Card>
        <div className="p-4">
          <div className="flex items-center space-x-2 mb-4">
            <Database className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-bold">Schema Overview</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Auth Users Schema */}
            <div className="border rounded-lg p-3 bg-blue-50 border-blue-200">
              <h3 className="font-medium text-blue-600 mb-2 flex items-center">
                <Users className="h-4 w-4 mr-1" />
                auth.users (Supabase Auth)
              </h3>
              <div className="text-sm text-gray-600 space-y-1">
                {authUsersSchema.map((column) => (
                  <div key={column.column_name} className="truncate">
                    <span className="font-medium">• {column.column_name}</span>
                    <span className="text-gray-500 ml-1">
                      ({column.data_type}
                      {column.is_nullable === 'YES' ? ', nullable' : ''})
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Regular Tables */}
            {tables.map((tableName) => (
              <div key={tableName} className="border rounded-lg p-3 bg-gray-50">
                <h3 className="font-medium text-blue-600 mb-2">{tableName}</h3>
                {schemaInfo[tableName] && (
                  <div className="text-sm text-gray-600 space-y-1">
                    {schemaInfo[tableName].map((column) => (
                      <div key={column.column_name} className="truncate">
                        <span className="font-medium">• {column.column_name}</span>
                        <span className="text-gray-500 ml-1">
                          ({column.data_type}
                          {column.is_nullable === 'YES' ? ', nullable' : ''})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Relations Section */}
      <Card>
        <div className="p-4">
          <div className="flex items-center space-x-2 mb-4">
            <Database className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-bold">Table Relationships</h2>
          </div>

          {Object.keys(relations).length === 0 ? (
            <p className="text-sm text-gray-500">No relationships found.</p>
          ) : (
            <div className="text-sm text-gray-700 space-y-1">
              {Object.entries(relations).map(([table, rels]) =>
                rels.map((rel, idx) => (
                  <p key={`${table}-${idx}`}>
                    <strong>{rel.table_name}.{rel.column_name}</strong> →{' '}
                    <span className="text-blue-600">
                      {rel.foreign_table_name}.{rel.foreign_column_name}
                    </span>
                  </p>
                ))
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Table List Section */}
      <Card>
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-2">
              <Database className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-bold">Table List</h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchTables}
              className="flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </Button>
          </div>
          
          <div className="space-y-2">
            {/* Auth Users Table */}
            <div className="border rounded-lg border-blue-200 bg-blue-50">
              <button
                onClick={toggleAuthUsers}
                className="w-full p-3 flex items-center justify-between hover:bg-blue-100"
              >
                <span className="font-medium flex items-center text-blue-700">
                  <Users className="h-4 w-4 mr-2" />
                  auth.users (Supabase Authentication Users)
                </span>
                {authUsersExpanded ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
              </button>
              
              {authUsersExpanded && (
                <div className="p-3 border-t border-blue-200">
                  {authUsersLoading ? (
                    <div className="text-center py-4 text-gray-500">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      Loading auth users...
                    </div>
                  ) : authUsers.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-blue-100">
                          <tr>
                            {authUsersSchema.map((column) => (
                              <th
                                key={column.column_name}
                                className="px-3 py-2 text-left text-xs font-medium text-blue-700 uppercase tracking-wider"
                              >
                                <div className="flex flex-col">
                                  <span>{column.column_name}</span>
                                  <span className="text-blue-500 text-[10px]">
                                    {column.data_type}
                                    {column.is_nullable === 'YES' ? ' (nullable)' : ''}
                                  </span>
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {authUsers.map((user, userIndex) => (
                            <tr key={user.id || userIndex} className="hover:bg-blue-50">
                              {authUsersSchema.map((column) => (
                                <td
                                  key={column.column_name}
                                  className="px-3 py-2 whitespace-nowrap text-gray-600"
                                >
                                  {user[column.column_name as keyof AuthUser]?.toString() || 'null'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      No auth users found or insufficient permissions to view auth users.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Regular Tables */}
            {tables.map((tableName) => (
              <div key={tableName} className="border rounded-lg">
                <button
                  onClick={() => toggleTable(tableName)}
                  className="w-full p-3 flex items-center justify-between hover:bg-gray-50"
                >
                  <span className="font-medium">{tableName}</span>
                  {expanded[tableName] ? (
                    <ChevronDown className="h-5 w-5" />
                  ) : (
                    <ChevronRight className="h-5 w-5" />
                  )}
                </button>
                
                {expanded[tableName] && (
                  <div className="p-3 border-t">
                    {tableData[tableName] ? (
                      <div className="space-y-4">
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                {schemaInfo[tableName]?.map((column) => (
                                  <th
                                    key={column.column_name}
                                    className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                  >
                                    <div className="flex flex-col">
                                      <span>{column.column_name}</span>
                                      <span className="text-gray-400 text-[10px]">
                                        {column.data_type}
                                        {column.is_nullable === 'YES' ? ' (nullable)' : ''}
                                      </span>
                                    </div>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {tableData[tableName].map((row, rowIndex) => (
                                <tr key={rowIndex} className="hover:bg-gray-50">
                                  {schemaInfo[tableName]?.map((column) => (
                                    <td
                                      key={column.column_name}
                                      className="px-3 py-2 whitespace-nowrap text-gray-600"
                                    >
                                      {row[column.column_name]?.toString() || 'null'}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {hasMore[tableName] && (
                          <div className="flex justify-center pt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => loadMore(tableName)}
                              disabled={loadingMore[tableName]}
                              className="flex items-center space-x-2"
                            >
                              {loadingMore[tableName] ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                  <span>Loading...</span>
                                </>
                              ) : (
                                <>
                                  <span>Load More</span>
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        Loading table data...
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Tables;
