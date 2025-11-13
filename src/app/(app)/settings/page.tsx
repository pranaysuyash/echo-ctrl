"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, User, Settings as SettingsIcon, Key } from "lucide-react";
import toast from "react-hot-toast";

interface UserSettings {
  defaultLanguage: string;
  noteVerbosity: string;
  hasCustomOpenAIKey: boolean;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const [defaultLanguage, setDefaultLanguage] = useState("en");
  const [noteVerbosity, setNoteVerbosity] = useState("normal");
  const [customOpenAIKey, setCustomOpenAIKey] = useState("");
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const response = await fetch("/api/settings");
      if (!response.ok) throw new Error("Failed to fetch settings");
      const data = await response.json();

      // Set initial values
      setDefaultLanguage(data.settings.defaultLanguage || "en");
      setNoteVerbosity(data.settings.noteVerbosity || "normal");

      return data.settings as UserSettings;
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<UserSettings> & { customOpenAIKey?: string }) => {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update settings");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Settings updated successfully");
      setShowApiKeyInput(false);
      setCustomOpenAIKey("");
    },
    onError: () => {
      toast.error("Failed to update settings");
    },
  });

  const handleSaveSettings = () => {
    const updateData: any = {
      defaultLanguage,
      noteVerbosity,
    };

    if (customOpenAIKey) {
      updateData.customOpenAIKey = customOpenAIKey;
    }

    updateSettingsMutation.mutate(updateData);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <SettingsIcon className="h-8 w-8" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your account and preferences
        </p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile
          </CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input
              value={session?.user?.name || ""}
              disabled
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Name cannot be changed at this time
            </p>
          </div>
          <div>
            <Label>Email</Label>
            <Input
              value={session?.user?.email || ""}
              disabled
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Email cannot be changed at this time
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Transcription Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Transcription</CardTitle>
          <CardDescription>Configure audio transcription preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="defaultLanguage">Default Language</Label>
            <select
              id="defaultLanguage"
              value={defaultLanguage}
              onChange={(e) => setDefaultLanguage(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="it">Italian</option>
              <option value="pt">Portuguese</option>
              <option value="nl">Dutch</option>
              <option value="ru">Russian</option>
              <option value="zh">Chinese</option>
              <option value="ja">Japanese</option>
              <option value="ko">Korean</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              The default language for audio transcription
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Note Generation Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Session Notes</CardTitle>
          <CardDescription>Configure how session notes are generated</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="noteVerbosity">Note Verbosity</Label>
            <select
              id="noteVerbosity"
              value={noteVerbosity}
              onChange={(e) => setNoteVerbosity(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
            >
              <option value="concise">Concise (2-3 paragraphs)</option>
              <option value="normal">Normal (4-6 paragraphs)</option>
              <option value="detailed">Detailed (8-12 paragraphs)</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              How detailed your automatically generated session notes should be
            </p>
          </div>
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Keys
          </CardTitle>
          <CardDescription>Optional: Use your own OpenAI API key</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Custom OpenAI API Key</Label>
              {settings?.hasCustomOpenAIKey && !showApiKeyInput && (
                <span className="text-xs text-green-600">✓ Custom key configured</span>
              )}
            </div>

            {showApiKeyInput ? (
              <div className="space-y-2">
                <Input
                  type="password"
                  value={customOpenAIKey}
                  onChange={(e) => setCustomOpenAIKey(e.target.value)}
                  placeholder="sk-..."
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowApiKeyInput(false);
                      setCustomOpenAIKey("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowApiKeyInput(true)}
              >
                {settings?.hasCustomOpenAIKey ? "Update" : "Add"} Custom Key
              </Button>
            )}

            <p className="text-xs text-muted-foreground mt-2">
              If provided, your custom key will be used instead of the app default.
              This key is encrypted and never shared.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button
          onClick={handleSaveSettings}
          disabled={updateSettingsMutation.isPending}
        >
          {updateSettingsMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
