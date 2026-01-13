import { useState } from 'react';
import type { Chat } from '../domain/Chat';
import type { Session } from '../../Session/domain/Session';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Trash2, MessageSquarePlus } from "lucide-react";

interface ChatListProps {
    session: Session | null;
    chats: Chat[];
    activeChatId: string | null;
    onSelectChat: (chatId: string) => void;
    onDeleteSession: () => void;
}

export default function ChatList({
    session,
    chats,
    activeChatId,
    onSelectChat,
    onDeleteSession,
}: ChatListProps) {
    const [filterMode, setFilterMode] = useState<'unread' | 'groups' | 'chats'>('chats');
    const [searchQuery, setSearchQuery] = useState('');

    if (!session) {
        return (
            <div className="w-[380px] h-full bg-white dark:bg-[#111b21] border-r border-[#d1d7db] dark:border-[#202c33] flex flex-col items-center justify-center text-[#54656f] dark:text-[#aebac1] px-8 text-center text-sm gap-4">
                <div className="w-16 h-16 bg-[#f0f2f5] dark:bg-[#202c33] rounded-full flex items-center justify-center mb-2">
                    <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor" className="opacity-40"><path d="M12.001 2.002c-5.522 0-9.999 4.477-9.999 9.999 0 5.523 4.477 9.999 9.999 9.999 5.523 0 9.999-4.476 9.999-9.999 0-5.522-4.476-9.999-9.999-9.999zm0 18.498c-4.687 0-8.499-3.812-8.499-8.499 0-4.687 3.812-8.499 8.499-8.499s8.499 3.812 8.499 8.499-3.812 8.499-8.499 8.499z"></path></svg>
                </div>
                <p>No active session selected.</p>
                <p className="text-xs opacity-70">Create or select a session from the sidebar to start.</p>
            </div>
        );
    }

    // Filter logic
    const filteredChats = chats.filter(chat => {
        // Exclude newsletters and status/stories
        if (chat.id.endsWith('@newsletter') || chat.id === 'status@broadcast') {
            return false;
        }

        // Search filter
        if (searchQuery && !chat.name.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false;
        }

        // Tab filter
        switch (filterMode) {
            case 'unread':
                return chat.unreadCount > 0;
            case 'groups':
                return chat.isGroup;
            case 'chats':
                return !chat.isGroup;
            default:
                return !chat.isGroup;
        }
    });

    return (
        <div className="w-[380px] h-full bg-white dark:bg-[#111b21] border-r border-[#d1d7db] dark:border-[#202c33] flex flex-col">
            {/* Header */}
            <div className="h-[60px] px-4 py-3 flex justify-between items-center bg-[#f0f2f5] dark:bg-[#202c33]">
                <div className="flex flex-col overflow-hidden mr-2">
                    <h2 className="font-medium text-[#111b21] dark:text-[#e9edef] truncate text-sm" title={session.id}>
                        {session.id}
                    </h2>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`w-2 h-2 rounded-full ${session.status === 'connected' ? 'bg-[#00a884]'
                            : session.status === 'disconnected' ? 'bg-red-500'
                                : 'bg-yellow-500'
                            }`}></span>
                        <span className="text-[11px] text-[#54656f] dark:text-[#aebac1] capitalize tracking-wide">{session.status}</span>
                    </div>
                </div>
                <div className="flex gap-1 text-[#54656f] dark:text-[#aebac1]">
                    <Button variant="ghost" size="icon" className="w-8 h-8 hover:text-red-500 hover:bg-black/5 dark:hover:bg-white/5" onClick={onDeleteSession} title="Delete Session">
                        <Trash2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-8 h-8 hover:bg-black/5 dark:hover:bg-white/5" title="New Chat">
                        <MessageSquarePlus className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="h-[52px] border-b border-[#e9edef] dark:border-[#202c33] flex items-center px-3 py-2">
                <div className="w-full relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#54656f] dark:text-[#aebac1]" />
                    <Input
                        className="w-full pl-9 h-[36px] bg-[#f0f2f5] dark:bg-[#202c33] border-none shadow-none text-sm text-[#111b21] dark:text-[#e9edef] placeholder:text-[#54656f] dark:placeholder:text-[#8696a0] focus-visible:ring-1 focus-visible:ring-[#00a884]"
                        placeholder="Search or start new chat"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Archive / Filter Strip */}
            <div className="px-3 py-2 border-b border-[#e9edef] dark:border-[#202c33]">
                <Tabs value={filterMode} onValueChange={(v) => setFilterMode(v as typeof filterMode)} className="w-full">
                    <TabsList className="bg-transparent p-0 h-auto gap-2 w-full justify-start">
                        <TabsTrigger
                            value="chats"
                            className="rounded-full px-3 py-1 h-auto text-xs data-[state=active]:bg-[#e7fce3] dark:data-[state=active]:bg-[#003c2a] data-[state=active]:text-[#008069] dark:data-[state=active]:text-[#00a884] data-[state=active]:shadow-none bg-[#f0f2f5] dark:bg-[#202c33] text-[#54656f] dark:text-[#8696a0]"
                        >
                            Chats ({chats.filter(c => !c.isGroup).length})
                        </TabsTrigger>
                        <TabsTrigger
                            value="unread"
                            className="rounded-full px-3 py-1 h-auto text-xs data-[state=active]:bg-[#e7fce3] dark:data-[state=active]:bg-[#003c2a] data-[state=active]:text-[#008069] dark:data-[state=active]:text-[#00a884] data-[state=active]:shadow-none bg-[#f0f2f5] dark:bg-[#202c33] text-[#54656f] dark:text-[#8696a0]"
                        >
                            Unread ({chats.filter(c => c.unreadCount > 0).length})
                        </TabsTrigger>
                        <TabsTrigger
                            value="groups"
                            className="rounded-full px-3 py-1 h-auto text-xs data-[state=active]:bg-[#e7fce3] dark:data-[state=active]:bg-[#003c2a] data-[state=active]:text-[#008069] dark:data-[state=active]:text-[#00a884] data-[state=active]:shadow-none bg-[#f0f2f5] dark:bg-[#202c33] text-[#54656f] dark:text-[#8696a0]"
                        >
                            Groups ({chats.filter(c => c.isGroup).length})
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Chat List */}
            <ScrollArea className="flex-1 w-full">
                <div className="flex flex-col">
                    {filteredChats.length === 0 ? (
                        <div className="p-8 text-center text-[#54656f] dark:text-[#8696a0] text-sm">
                            {searchQuery ? `No results for "${searchQuery}"` : 'No chats found'}
                        </div>
                    ) : (
                        filteredChats.map(chat => (
                            <div
                                key={chat.id}
                                onClick={() => onSelectChat(chat.id)}
                                className={`h-[72px] flex items-center px-3 cursor-pointer hover:bg-[#f5f6f6] dark:hover:bg-[#202c33] relative group ${activeChatId === chat.id ? 'bg-[#f0f2f5] dark:bg-[#2a3942]' : ''
                                    }`}
                            >
                                {/* Avatar */}
                                <Avatar className="w-[49px] h-[49px] mr-3">
                                    <AvatarImage src={chat.avatar} alt={chat.name} className="object-cover" />
                                    <AvatarFallback className="bg-[#dfe3e5] dark:bg-[#667781] text-white">
                                        <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M12.001 2.002c-5.522 0-9.999 4.477-9.999 9.999 0 5.523 4.477 9.999 9.999 9.999 5.523 0 9.999-4.476 9.999-9.999 0-5.522-4.476-9.999-9.999-9.999zm0 18.498c-4.687 0-8.499-3.812-8.499-8.499 0-4.687 3.812-8.499 8.499-8.499s8.499 3.812 8.499 8.499-3.812 8.499-8.499 8.499z"></path></svg>
                                    </AvatarFallback>
                                </Avatar>

                                {/* Content */}
                                <div className="flex-1 h-full border-b border-[#e9edef] dark:border-[#222d34] flex flex-col justify-center pr-1 group-hover:border-transparent">
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <span className="text-[17px] text-[#111b21] dark:text-[#e9edef] truncate max-w-[180px] font-normal leading-normal">
                                            {chat.name}
                                        </span>
                                        <span className={`text-[12px] ${chat.unreadCount > 0 ? 'text-[#1fa855] font-medium' : 'text-[#667781] dark:text-[#8696a0]'}`}>
                                            {chat.timestamp}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[14px] text-[#54656f] dark:text-[#8696a0] truncate max-w-[220px] leading-normal">
                                            {chat.lastMessage}
                                        </span>
                                        {chat.unreadCount > 0 && (
                                            <div className="min-w-[20px] h-[20px] px-1 rounded-full bg-[#25d366] text-white text-[10px] font-bold flex items-center justify-center leading-none shadow-sm">
                                                {chat.unreadCount}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
