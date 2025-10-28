import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Bot, 
  Power, 
  QrCode, 
  RefreshCw, 
  Phone, 
  Activity, 
  LogOut,
  MessageSquare,
  Users,
  Download,
  Shield,
  Zap,
  Image,
  Sticker,
  Link,
  Eye,
  UserPlus,
  FileText,
  Send
} from "lucide-react";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [userId] = useState(localStorage.getItem("userId"));
  const [username] = useState(localStorage.getItem("username"));
  const [ownerNumber, setOwnerNumber] = useState("");
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [bulkMessage, setBulkMessage] = useState("");
  const [bulkImageUrl, setBulkImageUrl] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) {
      setLocation("/login");
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("WebSocket connected");
      socket.send(JSON.stringify({ type: "subscribe", userId }));
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "qr" || data.type === "status") {
        queryClient.invalidateQueries({ queryKey: [`/api/bot/session?userId=${userId}`] });
        queryClient.refetchQueries({ queryKey: [`/api/bot/session?userId=${userId}`] });
      }
      if (data.type === "log") {
        queryClient.invalidateQueries({ queryKey: [`/api/bot/logs?userId=${userId}`] });
      }
    };

    setWs(socket);

    return () => {
      socket.close();
    };
  }, [userId, setLocation]);

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: [`/api/bot/session?userId=${userId}`],
    enabled: !!userId,
  });

  const { data: logs = [] } = useQuery({
    queryKey: [`/api/bot/logs?userId=${userId}`],
    enabled: !!userId,
  });

  const { data: contacts = [] } = useQuery({
    queryKey: [`/api/bot/contacts?userId=${userId}`],
    enabled: !!userId,
  });

  const { data: bulkStatus } = useQuery({
    queryKey: [`/api/bulk-messaging/status?userId=${userId}`],
    enabled: !!userId,
  });

  const generateQRMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/bot/generate-qr", { userId }),
    onSuccess: () => {
      toast({
        title: "QR Code Generating",
        description: "Scan the QR code with WhatsApp to connect",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/bot/session?userId=${userId}`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleBotMutation = useMutation({
    mutationFn: (action: "start" | "stop") => 
      apiRequest("POST", `/api/bot/${action}`, { userId }),
    onSuccess: (_, action) => {
      toast({
        title: action === "start" ? "Bot Started" : "Bot Stopped",
        description: `Your bot has been ${action === "start" ? "started" : "stopped"} successfully`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/bot/session?userId=${userId}`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateOwnerMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/bot/owner", { userId, ownerNumber }),
    onSuccess: () => {
      toast({
        title: "Owner Number Updated",
        description: "Bot will now accept commands from this number",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/bot/session?userId=${userId}`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateBotModeMutation = useMutation({
    mutationFn: (botMode: "private" | "public") => 
      apiRequest("POST", "/api/bot/mode", { userId, botMode }),
    onSuccess: (_, botMode) => {
      toast({
        title: "Bot Mode Updated",
        description: `Bot is now in ${botMode} mode`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/bot/session?userId=${userId}`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateKeepAliveMutation = useMutation({
    mutationFn: (keepAliveEnabled: boolean) => 
      apiRequest("POST", "/api/bot/keepalive", { userId, keepAliveEnabled }),
    onSuccess: (_, enabled) => {
      toast({
        title: "Keep-Alive Updated",
        description: `Bot keep-alive is now ${enabled ? "enabled" : "disabled"}`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/bot/session?userId=${userId}`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendBulkMessageMutation = useMutation({
    mutationFn: (data: { recipientNumbers: string[]; message: string; image?: string }) => 
      apiRequest("POST", "/api/bulk-messaging/send", { userId, ...data }),
    onSuccess: (data: any) => {
      toast({
        title: "Bulk Message Sent",
        description: `Message sent to ${data.recipientCount} recipients from your connected number`,
      });
      setBulkMessage("");
      setBulkImageUrl("");
      setSelectedContacts(new Set());
      queryClient.invalidateQueries({ queryKey: [`/api/bot/logs?userId=${userId}`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    localStorage.removeItem("userId");
    localStorage.removeItem("username");
    setLocation("/login");
  };

  const handleDownloadContacts = (contactId: string, groupName: string) => {
    window.location.href = `/api/bot/contacts/download/${contactId}?userId=${userId}`;
  };

  const handleToggleContact = (contactId: string) => {
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
    } else {
      newSelected.add(contactId);
    }
    setSelectedContacts(newSelected);
  };

  const handleSendBulkMessage = () => {
    if (!bulkMessage.trim()) {
      toast({
        title: "Message Required",
        description: "Please enter a message to send",
        variant: "destructive",
      });
      return;
    }

    if (session?.status !== "active") {
      toast({
        title: "Bot Not Active",
        description: "Please connect your bot before sending bulk messages",
        variant: "destructive",
      });
      return;
    }

    let recipientNumbers: string[] = [];
    if (selectedContacts.size === 0) {
      contacts.forEach((contact: any) => {
        recipientNumbers.push(...contact.contacts);
      });
    } else {
      contacts.forEach((contact: any) => {
        if (selectedContacts.has(contact.id)) {
          recipientNumbers.push(...contact.contacts);
        }
      });
    }

    recipientNumbers = Array.from(new Set(recipientNumbers));

    if (recipientNumbers.length === 0) {
      toast({
        title: "No Recipients",
        description: "Please extract contacts first or select groups",
        variant: "destructive",
      });
      return;
    }

    const maxRecipients = bulkStatus?.maxRecipients ?? 5;
    if (maxRecipients !== -1 && recipientNumbers.length > maxRecipients) {
      toast({
        title: "Recipient Limit Exceeded",
        description: `You can only send to ${maxRecipients} recipients. ${bulkStatus?.isPremium ? '' : 'Upgrade to premium for unlimited messaging.'}`,
        variant: "destructive",
      });
      return;
    }

    sendBulkMessageMutation.mutate({
      recipientNumbers,
      message: bulkMessage,
      image: bulkImageUrl || undefined,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500";
      case "connecting": return "bg-yellow-500 animate-pulse";
      case "error": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active": return "Active";
      case "connecting": return "Connecting";
      case "error": return "Error";
      default: return "Inactive";
    }
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <RefreshCw className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-lg text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">WhatsApp Bot Manager</h1>
              <p className="text-sm text-muted-foreground">Welcome, {username}</p>
            </div>
          </div>
          <Button variant="ghost" onClick={handleLogout} data-testid="button-logout">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bot Status</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${getStatusColor(session?.status || "inactive")}`} />
                <span className="text-2xl font-bold">{getStatusText(session?.status || "inactive")}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Connected Number</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-mono font-bold truncate">
                {session?.connectedNumber || "Not Connected"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bot Mode</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold capitalize">
                {session?.botMode || "Private"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Activity Logs</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{logs.length}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>QR Code Connection</CardTitle>
              <CardDescription>
                {session?.status === "inactive" 
                  ? "Generate and scan QR code to connect" 
                  : "Your bot is connected"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {session?.qrCode && session?.status === "connecting" ? (
                <div className="flex flex-col items-center gap-6 py-6 animate-in fade-in duration-500">
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary via-purple-500 to-primary rounded-3xl blur-xl opacity-75 group-hover:opacity-100 animate-pulse transition duration-1000" />
                    <div className="absolute -inset-2">
                      <div className="w-full h-full animate-spin-slow">
                        <div className="h-full w-full bg-gradient-to-r from-primary via-purple-500 to-primary rounded-3xl opacity-20 blur-md" />
                      </div>
                    </div>
                    <div className="relative bg-gradient-to-br from-white via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800 p-8 rounded-3xl shadow-2xl border-2 border-primary/30 backdrop-blur">
                      <div className="absolute top-4 left-4 h-3 w-3 rounded-full bg-primary animate-ping" />
                      <div className="absolute top-4 right-4 h-3 w-3 rounded-full bg-purple-500 animate-ping animation-delay-300" />
                      <div className="absolute bottom-4 left-4 h-3 w-3 rounded-full bg-blue-500 animate-ping animation-delay-600" />
                      <img 
                        src={session.qrCode} 
                        alt="WhatsApp QR Code" 
                        className="w-72 h-72 rounded-2xl relative z-10 shadow-lg"
                        data-testid="img-qrcode"
                      />
                    </div>
                  </div>
                  <div className="space-y-4 text-center max-w-md animate-in slide-in-from-bottom-4 duration-700">
                    <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-primary/10 via-purple-500/10 to-primary/10 border border-primary/20 backdrop-blur-sm">
                      <div className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
                      </div>
                      <p className="text-sm font-semibold bg-gradient-to-r from-primary via-purple-600 to-primary bg-clip-text text-transparent">
                        Waiting for your scan...
                      </p>
                    </div>
                    <div>
                      <p className="text-lg font-bold mb-2">Scan with WhatsApp</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Open WhatsApp → Settings → Linked Devices → Link a Device
                      </p>
                    </div>
                    <div className="pt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <div className="h-px w-12 bg-gradient-to-r from-transparent to-border" />
                      <span>QR Code expires in 60 seconds</span>
                      <div className="h-px w-12 bg-gradient-to-l from-transparent to-border" />
                    </div>
                  </div>
                </div>
              ) : session?.status === "active" ? (
                <div className="text-center py-8">
                  <div className="relative inline-block">
                    <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-green-500/20 to-green-600/20 flex items-center justify-center mx-auto mb-4 border-2 border-green-500/30">
                      <Bot className="h-10 w-10 text-green-500" />
                    </div>
                  </div>
                  <p className="text-xl font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
                    Bot Connected Successfully!
                  </p>
                  <p className="text-sm text-muted-foreground mt-3">
                    Connected as <span className="font-mono font-semibold text-foreground">{session.connectedNumber}</span>
                  </p>
                  <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs font-medium text-green-600 dark:text-green-400">Active & Ready</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="relative inline-block mb-6">
                    <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mx-auto border border-border/50">
                      <QrCode className="h-10 w-10 text-muted-foreground" />
                    </div>
                  </div>
                  <p className="text-base font-medium mb-2">No QR Code Generated</p>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                    Click the button below to generate a QR code and connect your WhatsApp bot
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={() => generateQRMutation.mutate()}
                  disabled={generateQRMutation.isPending || session?.status === "active"}
                  className="flex-1"
                  data-testid="button-generate-qr"
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  {generateQRMutation.isPending ? "Generating..." : "Generate QR Code"}
                </Button>
                {session?.status === "active" && (
                  <Button
                    variant="destructive"
                    onClick={() => toggleBotMutation.mutate("stop")}
                    disabled={toggleBotMutation.isPending}
                    data-testid="button-stop-bot"
                  >
                    <Power className="h-4 w-4 mr-2" />
                    Stop
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bot Configuration</CardTitle>
              <CardDescription>Configure bot settings and permissions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="owner-number">Owner Number (Optional)</Label>
                <div className="flex gap-2">
                  <Input
                    id="owner-number"
                    placeholder="+1234567890"
                    value={ownerNumber}
                    onChange={(e) => setOwnerNumber(e.target.value)}
                    data-testid="input-owner-number"
                  />
                  <Button
                    onClick={() => updateOwnerMutation.mutate()}
                    disabled={updateOwnerMutation.isPending || !ownerNumber}
                    data-testid="button-update-owner"
                  >
                    Update
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Bot will accept commands from this number
                </p>
                {session?.ownerNumber && (
                  <Badge variant="secondary" className="mt-2">
                    Current: {session.ownerNumber}
                  </Badge>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bot-mode">Bot Mode</Label>
                <Select
                  value={session?.botMode || "private"}
                  onValueChange={(value) => updateBotModeMutation.mutate(value as "private" | "public")}
                  disabled={updateBotModeMutation.isPending}
                >
                  <SelectTrigger id="bot-mode" data-testid="select-bot-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private (Only owner & bot)</SelectItem>
                    <SelectItem value="public">Public (Anyone can use)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Control who can use bot commands
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="keep-alive">Keep Bot Alive</Label>
                  <p className="text-xs text-muted-foreground">
                    Prevent bot from sleeping on free hosting
                  </p>
                </div>
                <Switch
                  id="keep-alive"
                  checked={session?.keepAliveEnabled ?? true}
                  onCheckedChange={(checked) => updateKeepAliveMutation.mutate(checked)}
                  disabled={updateKeepAliveMutation.isPending}
                  data-testid="switch-keep-alive"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Available Commands</CardTitle>
            <CardDescription>All commands your bot can execute</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-3 rounded-lg border bg-card hover-elevate">
                <div className="flex items-center gap-2 mb-2">
                  <UserPlus className="h-4 w-4 text-primary" />
                  <code className="text-sm font-semibold">.kick @user</code>
                </div>
                <p className="text-xs text-muted-foreground">Remove mentioned user</p>
              </div>
              
              <div className="p-3 rounded-lg border bg-card hover-elevate">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-primary" />
                  <code className="text-sm font-semibold">.extract</code>
                </div>
                <p className="text-xs text-muted-foreground">Extract group contacts</p>
              </div>
              
              <div className="p-3 rounded-lg border bg-card hover-elevate">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <code className="text-sm font-semibold">.ct</code>
                </div>
                <p className="text-xs text-muted-foreground">Extract with preview</p>
              </div>
              
              <div className="p-3 rounded-lg border bg-card hover-elevate">
                <div className="flex items-center gap-2 mb-2">
                  <Sticker className="h-4 w-4 text-primary" />
                  <code className="text-sm font-semibold">.sticker</code>
                </div>
                <p className="text-xs text-muted-foreground">Image to sticker</p>
              </div>
              
              <div className="p-3 rounded-lg border bg-card hover-elevate">
                <div className="flex items-center gap-2 mb-2">
                  <Image className="h-4 w-4 text-primary" />
                  <code className="text-sm font-semibold">.toimg</code>
                </div>
                <p className="text-xs text-muted-foreground">Sticker to image</p>
              </div>
              
              <div className="p-3 rounded-lg border bg-card hover-elevate">
                <div className="flex items-center gap-2 mb-2">
                  <Link className="h-4 w-4 text-primary" />
                  <code className="text-sm font-semibold">antilink on</code>
                </div>
                <p className="text-xs text-muted-foreground">Auto-delete links</p>
              </div>
              
              <div className="p-3 rounded-lg border bg-card hover-elevate">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="h-4 w-4 text-primary" />
                  <code className="text-sm font-semibold">antiviewonce on</code>
                </div>
                <p className="text-xs text-muted-foreground">Save view-once media</p>
              </div>
              
              <div className="p-3 rounded-lg border bg-card hover-elevate">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <code className="text-sm font-semibold">.taghide</code>
                </div>
                <p className="text-xs text-muted-foreground">Tag all (hidden)</p>
              </div>
              
              <div className="p-3 rounded-lg border bg-card hover-elevate">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <code className="text-sm font-semibold">menu</code>
                </div>
                <p className="text-xs text-muted-foreground">Show full menu</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="logs" className="mt-6">
          <TabsList className="grid w-full grid-cols-3 max-w-3xl">
            <TabsTrigger value="logs" data-testid="tab-logs">Activity Logs</TabsTrigger>
            <TabsTrigger value="contacts" data-testid="tab-contacts">Extracted Contacts</TabsTrigger>
            <TabsTrigger value="bulk" data-testid="tab-bulk">Bulk Messaging</TabsTrigger>
          </TabsList>
          <TabsContent value="logs" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>View your bot's recent messages and commands</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  {logs.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No activity yet</p>
                      <p className="text-sm mt-2">Logs will appear here once your bot is active</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {logs.map((log: any) => (
                        <div
                          key={log.id}
                          className="p-3 rounded-lg border bg-card hover-elevate"
                          data-testid={`log-${log.id}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <Badge variant={log.type === "error" ? "destructive" : "secondary"} className="mb-2">
                                {log.type}
                              </Badge>
                              <p className="text-sm">{log.message}</p>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(log.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="contacts" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Extracted Contacts</CardTitle>
                <CardDescription>Phone numbers extracted from groups</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  {contacts.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No contacts extracted yet</p>
                      <p className="text-sm mt-2">Use .extract command in a group to save contacts</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {contacts.map((contact: any) => (
                        <div
                          key={contact.id}
                          className="p-4 rounded-lg border bg-card"
                          data-testid={`contact-${contact.id}`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-semibold">{contact.groupName}</h4>
                              <p className="text-sm text-muted-foreground">
                                {contact.contacts.length} contacts
                              </p>
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleDownloadContacts(contact.id, contact.groupName)}
                              data-testid={`button-download-${contact.id}`}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download CSV
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {contact.contacts.slice(0, 5).map((num: string, idx: number) => (
                              <Badge key={idx} variant="secondary" className="font-mono text-xs">
                                {num}
                              </Badge>
                            ))}
                            {contact.contacts.length > 5 && (
                              <Badge variant="outline" className="text-xs">
                                +{contact.contacts.length - 5} more
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
          <TabsContent value="bulk" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Bulk Messaging</CardTitle>
                <CardDescription>
                  Send messages to your extracted contacts from your connected number
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                  <div className="flex items-center gap-3">
                    {bulkStatus?.isPremium ? (
                      <>
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Shield className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">Premium Account</p>
                          <p className="text-sm text-muted-foreground">
                            Unlimited bulk messaging until {bulkStatus?.premiumUntil ? new Date(bulkStatus.premiumUntil).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="h-10 w-10 rounded-full bg-muted-foreground/10 flex items-center justify-center">
                          <Users className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-semibold">Free Account</p>
                          <p className="text-sm text-muted-foreground">
                            Limited to 5 recipients per message
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                  <Badge variant={bulkStatus?.isPremium ? "default" : "secondary"}>
                    {bulkStatus?.isPremium ? "Premium" : "Free"}
                  </Badge>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bulk-message">Message</Label>
                    <Textarea
                      id="bulk-message"
                      placeholder="Enter your message here..."
                      value={bulkMessage}
                      onChange={(e) => setBulkMessage(e.target.value)}
                      rows={5}
                      data-testid="textarea-bulk-message"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bulk-image">Image URL (Optional)</Label>
                    <Input
                      id="bulk-image"
                      placeholder="https://example.com/image.jpg"
                      value={bulkImageUrl}
                      onChange={(e) => setBulkImageUrl(e.target.value)}
                      data-testid="input-bulk-image"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Select Groups (Leave empty to send to all)</Label>
                    <ScrollArea className="h-[200px] rounded-lg border p-4">
                      {contacts.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No contacts extracted yet</p>
                          <p className="text-xs mt-1">Use .extract command in a group first</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {contacts.map((contact: any) => (
                            <div
                              key={contact.id}
                              className="flex items-start gap-3 p-3 rounded-lg border hover-elevate"
                              data-testid={`bulk-contact-${contact.id}`}
                            >
                              <Checkbox
                                id={`contact-${contact.id}`}
                                checked={selectedContacts.has(contact.id)}
                                onCheckedChange={() => handleToggleContact(contact.id)}
                                data-testid={`checkbox-contact-${contact.id}`}
                              />
                              <div className="flex-1">
                                <Label
                                  htmlFor={`contact-${contact.id}`}
                                  className="font-semibold cursor-pointer"
                                >
                                  {contact.groupName}
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                  {contact.contacts.length} contacts
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                    <div>
                      <p className="font-semibold">Total Recipients</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedContacts.size === 0
                          ? `All extracted contacts (${Array.from(new Set(contacts.flatMap((c: any) => c.contacts))).length})`
                          : `${Array.from(new Set(contacts.filter((c: any) => selectedContacts.has(c.id)).flatMap((c: any) => c.contacts))).length} from selected groups`}
                      </p>
                    </div>
                    <Badge variant="outline">
                      Limit: {bulkStatus?.maxRecipients === -1 ? "Unlimited" : bulkStatus?.maxRecipients ?? 5}
                    </Badge>
                  </div>

                  <Button
                    onClick={handleSendBulkMessage}
                    disabled={sendBulkMessageMutation.isPending || !bulkMessage.trim() || session?.status !== "active"}
                    className="w-full"
                    data-testid="button-send-bulk"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {sendBulkMessageMutation.isPending ? "Sending..." : "Send Bulk Message"}
                  </Button>

                  {session?.status !== "active" && (
                    <p className="text-sm text-center text-muted-foreground">
                      Connect your bot first to send bulk messages
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
