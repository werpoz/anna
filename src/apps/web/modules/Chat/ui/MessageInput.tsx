import { useState, useRef, ChangeEvent } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MoreVertical, Paperclip, Smile, Mic, SendHorizontal, X, File as FileIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type MediaType = 'image' | 'video' | 'audio' | 'document';

export interface MediaAttachment {
    file: File;
    kind: MediaType;
    previewUrl: string;
}

interface MessageInputProps {
    onSendMessage: (text: string, media?: MediaAttachment) => Promise<void> | void;
    disabled?: boolean;
}

export const MessageInput = ({ onSendMessage, disabled }: MessageInputProps) => {
    const [text, setText] = useState('');
    const [attachment, setAttachment] = useState<MediaAttachment | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        let kind: MediaType = 'document';
        if (file.type.startsWith('image/')) kind = 'image';
        else if (file.type.startsWith('video/')) kind = 'video';
        else if (file.type.startsWith('audio/')) kind = 'audio';

        setAttachment({
            file,
            kind,
            previewUrl: URL.createObjectURL(file)
        });

        // Reset file input so same file can be selected again if needed
        e.target.value = '';
    };

    const handleClearAttachment = () => {
        if (attachment?.previewUrl) {
            URL.revokeObjectURL(attachment.previewUrl);
        }
        setAttachment(null);
    };

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();

        if ((!text.trim() && !attachment) || isUploading) return;

        setIsUploading(true);
        try {
            await onSendMessage(text, attachment ?? undefined);
            setText('');
            handleClearAttachment();
        } finally {
            setIsUploading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="min-h-[62px] bg-[#f0f2f5] dark:bg-[#202c33] px-2 py-2 flex flex-col gap-1 z-10 border-t border-[#d1d7db] dark:border-[#222d34]">
            {/* Attachment Preview Area */}
            {attachment && (
                <div className="flex items-center gap-3 p-2 bg-[#e9edef] dark:bg-[#2a3942] rounded-lg mb-1 relative animate-in slide-in-from-bottom-2 fade-in duration-200">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 bg-gray-500 hover:bg-red-500 text-white rounded-full shadow-md z-10"
                        onClick={handleClearAttachment}
                    >
                        <X className="h-4 w-4" />
                    </Button>

                    <div className="flex-shrink-0 w-16 h-16 bg-black/10 rounded overflow-hidden flex items-center justify-center">
                        {attachment.kind === 'image' && (
                            <img src={attachment.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                        )}
                        {attachment.kind === 'video' && (
                            <video src={attachment.previewUrl} className="w-full h-full object-cover" />
                        )}
                        {attachment.kind === 'audio' && (
                            <div className="text-gray-500"><Mic className="h-8 w-8" /></div>
                        )}
                        {attachment.kind === 'document' && (
                            <div className="text-gray-500"><FileIcon className="h-8 w-8" /></div>
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-[#111b21] dark:text-[#e9edef]">
                            {attachment.file.name}
                        </p>
                        <p className="text-xs text-[#54656f] dark:text-[#8696a0]">
                            {(attachment.file.size / 1024 / 1024).toFixed(2)} MB • {attachment.kind.toUpperCase()}
                        </p>
                    </div>
                </div>
            )}

            <div className="flex items-end gap-1">
                <div className="flex gap-1 pb-2">
                    <Button variant="ghost" size="icon" className="text-[#54656f] dark:text-[#aebac1] hover:bg-black/5">
                        <Smile className="w-6 h-6" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-[#54656f] dark:text-[#aebac1] hover:bg-black/5"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Paperclip className="w-6 h-6" />
                    </Button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileSelect}
                        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                    />
                </div>

                <form onSubmit={handleSend} className="flex-1 mx-2">
                    <Input
                        type="text"
                        placeholder={attachment ? "Add a caption..." : "Type a message"}
                        className="w-full px-4 py-6 rounded-lg bg-white dark:bg-[#2a3942] text-[15px] text-[#111b21] dark:text-[#e9edef] placeholder:text-[#54656f] border-none shadow-none focus-visible:ring-0"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={disabled || isUploading}
                    />
                </form>

                <div className="flex items-center pb-2">
                    {text.trim() || attachment ? (
                        <Button
                            onClick={() => handleSend()}
                            variant="ghost"
                            size="icon"
                            className="text-[#54656f] dark:text-[#aebac1] hover:bg-black/5"
                            disabled={disabled || isUploading}
                        >
                            <SendHorizontal className={cn("w-6 h-6", isUploading && "opacity-50 animate-pulse")} />
                        </Button>
                    ) : (
                        <Button variant="ghost" size="icon" className="text-[#54656f] dark:text-[#aebac1] hover:bg-black/5">
                            <Mic className="w-6 h-6" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};
