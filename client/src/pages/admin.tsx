import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { adminLoginSchema, type AdminLoginData } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Shield, LogOut, Play, Pause, Activity, Users, Bot, MessageSquare, Download, FileText, Crown, Plus, Trash2, Phone } from "lucide-react";

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(localStorage.getItem("adminAuth") === "true");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<AdminLoginData>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: {
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: AdminLoginData) => {
      return await apiRequest("POST", "/api/admin/login", data);
    },
    onSuccess: () => {
      localStorage.setItem("adminAuth", "true");
      setIsAuthenticated(true);
      toast({
        title: "Admin Access Granted",
        description: "Welcome to the admin panel",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Access Denied",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AdminLoginData) => {
    loginMutation.mutate(data);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-2 text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="h-9 w-9 text-primary" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">Admin Access</CardTitle>
            <CardDescription className="text-base">
              Enter your 4-digit access code
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          placeholder="Enter admin password"
                          className="text-center text-2xl font-mono tracking-widest"
                          data-testid="input-admin-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginMutation.isPending}
                  data-testid="button-admin-login"
                >
                  {loginMutation.isPending ? "Verifying..." : "Access Admin Panel"}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center">
              <Button
                variant="ghost"
                className="text-sm"
                onClick={() => setLocation("/login")}
                data-testid="link-back-login"
              >
                Back to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <AdminDashboard onLogout={() => {
    localStorage.removeItem("adminAuth");
    setIsAuthenticated(false);
  }} />;
}

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const { toast } = useToast();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["/api/admin/users"],
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/admin/stats"],
  });

  const { data: allContacts = [] } = useQuery({
    queryKey: ["/api/admin/contacts"],
  });

  const controlBotMutation = useMutation({
    mutationFn: ({ userId, action }: { userId: string; action: "start" | "stop" }) =>
      apiRequest("POST", `/api/admin/bot/${action}`, { userId }),
    onSuccess: (_, variables) => {
      toast({
        title: `Bot ${variables.action === "start" ? "Started" : "Stopped"}`,
        description: `User's bot has been ${variables.action === "start" ? "resumed" : "stopped"} successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDownloadAllContacts = () => {
    window.location.href = '/api/admin/contacts/download';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500";
      case "connecting": return "bg-yellow-500";
      case "error": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Admin Panel</h1>
              <p className="text-sm text-muted-foreground">Manage all bot instances</p>
            </div>
          </div>
          <Button variant="ghost" onClick={onLogout} data-testid="button-admin-logout">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Bots</CardTitle>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeBots || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Messages Today</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.messagesToday || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {allContacts.reduce((acc: number, contact: any) => acc + contact.contacts.length, 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 max-w-5xl">
            <TabsTrigger value="users" data-testid="tab-users">Users & Bots</TabsTrigger>
            <TabsTrigger value="premium" data-testid="tab-premium">Premium</TabsTrigger>
            <TabsTrigger value="contacts" data-testid="tab-all-contacts">Contacts</TabsTrigger>
            <TabsTrigger value="bulk-message" data-testid="tab-bulk-message">Bulk Message</TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings">Settings</TabsTrigger>
            <TabsTrigger value="repo" data-testid="tab-repo">Repo Info</TabsTrigger>
          </TabsList>

          <TabsContent value="premium">
            <PremiumUsersTab users={users} />
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>View and control all registered users and their bots</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Loading users...
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No users registered yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Bot Name</TableHead>
                          <TableHead>Username</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Connected Number</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user: any) => (
                          <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                            <TableCell className="font-medium">{user.botName}</TableCell>
                            <TableCell className="font-mono text-sm">{user.username}</TableCell>
                            <TableCell className="text-sm">{user.email}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className={`h-2 w-2 rounded-full ${getStatusColor(user.botStatus || "inactive")}`} />
                                <Badge variant={user.botStatus === "active" ? "default" : "secondary"}>
                                  {user.botStatus || "inactive"}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {user.connectedNumber || "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {user.botStatus === "active" ? (
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => controlBotMutation.mutate({ userId: user.id, action: "stop" })}
                                    disabled={controlBotMutation.isPending}
                                    data-testid={`button-stop-${user.id}`}
                                  >
                                    <Pause className="h-4 w-4 mr-1" />
                                    Stop
                                  </Button>
                                ) : user.connectedNumber ? (
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => controlBotMutation.mutate({ userId: user.id, action: "start" })}
                                    disabled={controlBotMutation.isPending}
                                    data-testid={`button-resume-${user.id}`}
                                  >
                                    <Play className="h-4 w-4 mr-1" />
                                    Resume
                                  </Button>
                                ) : (
                                  <Badge variant="outline">Not Connected</Badge>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contacts">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>All Extracted Contacts</CardTitle>
                    <CardDescription>View and download all contacts from all users</CardDescription>
                  </div>
                  <Button 
                    onClick={handleDownloadAllContacts}
                    data-testid="button-download-all-contacts"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download All (CSV)
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px] pr-4">
                  {allContacts.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No contacts extracted yet</p>
                      <p className="text-sm mt-2">Contacts will appear here once users extract them</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {allContacts.map((contact: any) => (
                        <div
                          key={contact.id}
                          className="p-4 rounded-lg border bg-card hover-elevate"
                          data-testid={`contact-${contact.id}`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-semibold">{contact.groupName}</h4>
                              <p className="text-sm text-muted-foreground">
                                User: {contact.username} | {contact.contacts.length} contacts
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Extracted: {new Date(contact.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {contact.contacts.slice(0, 8).map((num: string, idx: number) => (
                              <Badge key={idx} variant="secondary" className="font-mono text-xs">
                                {num}
                              </Badge>
                            ))}
                            {contact.contacts.length > 8 && (
                              <Badge variant="outline" className="text-xs">
                                +{contact.contacts.length - 8} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bulk-message">
            <BulkMessageTab />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsTab />
          </TabsContent>

          <TabsContent value="repo">
            <RepoInfoTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function BulkMessageTab() {
  const { toast } = useToast();
  const [targetType, setTargetType] = useState<'connected' | 'extracted'>('connected');
  const [message, setMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const bulkMessageMutation = useMutation({
    mutationFn: async (data: { targetType: string; message: string; imageUrl?: string }) =>
      apiRequest('POST', '/api/admin/bulk-message', data),
    onSuccess: () => {
      toast({
        title: 'Bulk Message Sent',
        description: 'Messages are being sent to all recipients',
      });
      setMessage('');
      setImageUrl('');
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSendBulkMessage = () => {
    if (!message.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a message',
        variant: 'destructive',
      });
      return;
    }

    bulkMessageMutation.mutate({
      targetType,
      message,
      imageUrl: imageUrl.trim() || undefined,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Send Bulk Messages</CardTitle>
        <CardDescription>Send messages to all connected numbers or extracted contacts</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Recipient Type</label>
          <Select value={targetType} onValueChange={(val) => setTargetType(val as any)}>
            <SelectTrigger data-testid="select-recipient-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="connected" data-testid="option-recipient-connected">Connected Numbers Only</SelectItem>
              <SelectItem value="extracted" data-testid="option-recipient-extracted">All Extracted Contacts</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Message</label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter your message here..."
            rows={6}
            data-testid="textarea-bulk-message"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Image URL (Optional)</label>
          <Input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
            data-testid="input-image-url"
          />
        </div>

        <Button
          onClick={handleSendBulkMessage}
          disabled={bulkMessageMutation.isPending}
          className="w-full"
          data-testid="button-send-bulk"
        >
          {bulkMessageMutation.isPending ? (
            <>Sending Messages...</>
          ) : (
            <>
              <MessageSquare className="h-4 w-4 mr-2" />
              Send Bulk Messages
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function PremiumUsersTab({ users }: { users: any[] }) {
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState('');
  const [hours, setHours] = useState('24');

  const { data: premiumUsers = [], isLoading } = useQuery({
    queryKey: ['/api/admin/premium-users'],
  });

  const addPremiumMutation = useMutation({
    mutationFn: async (data: { userId: string; hours: number }) =>
      apiRequest('POST', '/api/admin/premium-users/add', data),
    onSuccess: () => {
      toast({
        title: 'Premium Access Granted',
        description: 'User can now send unlimited bulk messages',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/premium-users'] });
      setSelectedUserId('');
      setHours('24');
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const removePremiumMutation = useMutation({
    mutationFn: async (userId: string) =>
      apiRequest('DELETE', `/api/admin/premium-users/${userId}`, {}),
    onSuccess: () => {
      toast({
        title: 'Premium Access Revoked',
        description: 'User is now limited to 5 bulk messages',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/premium-users'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleAddPremium = () => {
    if (!selectedUserId) {
      toast({
        title: 'Error',
        description: 'Please select a user',
        variant: 'destructive',
      });
      return;
    }

    const hoursNum = parseInt(hours);
    if (isNaN(hoursNum) || hoursNum < 1) {
      toast({
        title: 'Error',
        description: 'Please enter a valid number of hours (minimum 1)',
        variant: 'destructive',
      });
      return;
    }

    addPremiumMutation.mutate({ userId: selectedUserId, hours: hoursNum });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            Grant Premium Access
          </CardTitle>
          <CardDescription>Give users unlimited bulk messaging for a specific duration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select User</label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger data-testid="select-premium-user">
                <SelectValue placeholder="Choose a user..." />
              </SelectTrigger>
              <SelectContent>
                {users.map((user: any) => (
                  <SelectItem key={user.id} value={user.id} data-testid={`option-user-${user.id}`}>
                    {user.username} ({user.botName})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Premium Duration (Hours)</label>
            <Input
              type="number"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="24"
              min="1"
              data-testid="input-premium-hours"
            />
            <p className="text-xs text-muted-foreground">
              Premium access will expire after this many hours
            </p>
          </div>

          <Button
            onClick={handleAddPremium}
            disabled={addPremiumMutation.isPending}
            className="w-full"
            data-testid="button-grant-premium"
          >
            {addPremiumMutation.isPending ? 'Granting...' : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Grant Premium Access
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Premium Users</CardTitle>
          <CardDescription>Users with unlimited bulk messaging access</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : premiumUsers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Crown className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No premium users yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {premiumUsers.map((premium: any) => {
                const expiresAt = new Date(premium.premiumUntil);
                const isExpired = expiresAt < new Date();
                const hoursLeft = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60));

                return (
                  <div
                    key={premium.id}
                    className="p-4 rounded-lg border bg-card flex items-center justify-between"
                    data-testid={`premium-user-${premium.userId}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{premium.username || 'Unknown User'}</h4>
                        <Badge variant={isExpired ? "secondary" : "default"} className="gap-1">
                          <Crown className="h-3 w-3" />
                          {isExpired ? 'Expired' : 'Premium'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {premium.email}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {isExpired ? (
                          `Expired ${Math.abs(hoursLeft)} hours ago`
                        ) : (
                          `Expires in ${hoursLeft} hours (${expiresAt.toLocaleString()})`
                        )}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removePremiumMutation.mutate(premium.userId)}
                      disabled={removePremiumMutation.isPending}
                      data-testid={`button-revoke-${premium.userId}`}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Revoke
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsTab() {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [adminNumber, setAdminNumber] = useState('');

  const { data: adminNumberData } = useQuery({
    queryKey: ['/api/admin/admin-number'],
  });

  useEffect(() => {
    if (adminNumberData) {
      setAdminNumber((adminNumberData as any).adminNumber || '');
    }
  }, [adminNumberData]);

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) =>
      apiRequest('POST', '/api/admin/change-password', data),
    onSuccess: () => {
      toast({
        title: 'Password Changed',
        description: 'Your admin password has been updated successfully',
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateAdminNumberMutation = useMutation({
    mutationFn: async (data: { adminNumber: string }) =>
      apiRequest('POST', '/api/admin/admin-number', data),
    onSuccess: () => {
      toast({
        title: 'Admin Number Updated',
        description: 'The admin contact number has been updated',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/admin-number'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'New passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 4) {
      toast({
        title: 'Error',
        description: 'Password must be at least 4 characters',
        variant: 'destructive',
      });
      return;
    }

    changePasswordMutation.mutate({
      currentPassword,
      newPassword,
    });
  };

  const handleUpdateAdminNumber = () => {
    updateAdminNumberMutation.mutate({ adminNumber });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Admin Contact Number
          </CardTitle>
          <CardDescription>Users will see this number when they want to upgrade to premium</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Admin WhatsApp Number</label>
            <Input
              value={adminNumber}
              onChange={(e) => setAdminNumber(e.target.value)}
              placeholder="+1234567890"
              data-testid="input-admin-number"
            />
            <p className="text-xs text-muted-foreground">
              Include country code (e.g., +1234567890)
            </p>
          </div>

          <Button
            onClick={handleUpdateAdminNumber}
            disabled={updateAdminNumberMutation.isPending}
            className="w-full"
            data-testid="button-update-admin-number"
          >
            {updateAdminNumberMutation.isPending ? 'Updating...' : 'Update Admin Number'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Admin Password</CardTitle>
          <CardDescription>Update your admin panel access password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Current Password</label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              data-testid="input-current-password"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">New Password</label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              data-testid="input-new-password"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Confirm New Password</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              data-testid="input-confirm-password"
            />
          </div>

          <Button
            onClick={handleChangePassword}
            disabled={changePasswordMutation.isPending}
            className="w-full"
            data-testid="button-change-password"
          >
            {changePasswordMutation.isPending ? 'Updating...' : 'Change Password'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function RepoInfoTab() {
  const { toast } = useToast();
  const [repoMessage, setRepoMessage] = useState('');

  const { data: settings } = useQuery({
    queryKey: ['/api/admin/settings'],
  });

  const updateRepoMutation = useMutation({
    mutationFn: async (data: { repoMessage: string }) =>
      apiRequest('POST', '/api/admin/settings', data),
    onSuccess: () => {
      toast({
        title: 'Repo Message Updated',
        description: 'The repository message has been updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  useEffect(() => {
    if (settings) {
      setRepoMessage((settings as any).repoMessage || '');
    }
  }, [settings]);

  const handleUpdateRepo = () => {
    if (!repoMessage.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a repository message',
        variant: 'destructive',
      });
      return;
    }

    updateRepoMutation.mutate({ repoMessage });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Repository Information</CardTitle>
        <CardDescription>Customize the message shown when users type .sc or .repo</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Repository Message</label>
          <Textarea
            value={repoMessage}
            onChange={(e) => setRepoMessage(e.target.value)}
            placeholder="📦 *Source Code Repository*&#10;&#10;GitHub: https://github.com/yourusername/yourrepo&#10;&#10;Feel free to contribute or report issues!"
            rows={8}
            data-testid="textarea-repo-message"
          />
          <p className="text-xs text-muted-foreground">
            Tip: Use *text* for bold, _text_ for italic, and &#10; for new lines in WhatsApp
          </p>
        </div>

        <Button
          onClick={handleUpdateRepo}
          disabled={updateRepoMutation.isPending}
          className="w-full"
          data-testid="button-update-repo"
        >
          {updateRepoMutation.isPending ? 'Updating...' : 'Update Repository Message'}
        </Button>
      </CardContent>
    </Card>
  );
}
