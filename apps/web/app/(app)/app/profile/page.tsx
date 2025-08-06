"use client";

import { useSession } from "@/components/providers/session";
import { authClient } from "@call/auth/auth-client";
import { Button } from "@call/ui/components/button";
import { Input } from "@call/ui/components/input";
import { Label } from "@call/ui/components/label";
import { UserProfile } from "@call/ui/components/use-profile";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { FiCamera, FiMail, FiCalendar, FiEdit2, FiCheck, FiX } from "react-icons/fi";
import { Badge } from "@call/ui/components/badge";
import { Separator } from "@call/ui/components/separator";

export default function ProfilePage() {
  const { user } = useSession();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user.name || "");
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpdateProfile = async () => {
    if (!name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/update-profile`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ name }),
        }
      );

      if (!res.ok) {
        throw new Error("Failed to update profile");
      }
      await authClient.getSession();

      toast.success("Profile updated successfully");
      setIsEditing(false);
      window.location.reload();
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    setImageLoading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/update-profile-image`,
        {
          method: "PATCH",
          credentials: "include",
          body: formData,
        }
      );

      if (!res.ok) {
        throw new Error("Failed to update profile image");
      }

      await authClient.getSession();
      toast.success("Profile image updated successfully");
      window.location.reload();
    } catch (error) {
      toast.error("Failed to update profile image");
    } finally {
      setImageLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)]  from-primary/5 to-background p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header Section */}
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="group relative cursor-pointer" onClick={handleImageClick}>
            <div className="relative h-32 w-32">
              <UserProfile name={user.name} url={user.image} className="h-full w-full" size="lg" />
              <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/0 transition-colors group-hover:bg-black/40">
                <FiCamera className="hidden h-8 w-8 text-white group-hover:block" />
              </div>
              {imageLoading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </div>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleImageChange}
              disabled={imageLoading}
            />
          </div>

          <div className="space-y-1">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10 text-xl font-semibold"
                  disabled={loading}
                />
                <Button size="icon" onClick={handleUpdateProfile} disabled={loading}>
                  <FiCheck className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setName(user.name);
                  }}
                  disabled={loading}
                >
                  <FiX className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <h1 className="text-2xl font-semibold">{user.name}</h1>
                <Button size="icon" variant="ghost" onClick={() => setIsEditing(true)}>
                  <FiEdit2 className="h-4 w-4" />
                </Button>
              </div>
            )}
            <p className="text-muted-foreground">{user.email}</p>
          </div>

        
        </div>

        <Separator />

        {/* Stats Section */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
            <div className="flex items-center gap-2">
              <FiMail className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-medium">Email Status</h3>
            </div>
            <p className="mt-2 text-2xl font-semibold">
              {user.emailVerified ? "Verified" : "Pending"}
            </p>
          </div>

          <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
            <div className="flex items-center gap-2">
              <FiCalendar className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-medium">Member Since</h3>
            </div>
            <p className="mt-2 text-2xl font-semibold">
              {new Date(user.createdAt).toLocaleDateString(undefined, {
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>

          <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
            <div className="flex items-center gap-2">
              <FiMail className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-medium">Total Calls</h3>
            </div>
            <p className="mt-2 text-2xl font-semibold">0</p>
          </div>
        </div>

      </div>
    </div>
  );
}
