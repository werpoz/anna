import { useState, useRef, useEffect } from 'react';
import { Chat } from '../domain/Chat';
import { Message } from '../domain/Message';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, MoreVertical, Paperclip, Smile, Mic, SendHorizontal } from "lucide-react";

interface ChatConversationProps {
    chat?: Chat; // Pass the full chat object to get name/avatar
    messages: Message[];
    onSendMessage: (text: string) => void;
}

export default function ChatConversation({
    chat,
    messages,
    onSendMessage,
}: ChatConversationProps) {
    const [inputText, setInputText] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (inputText.trim()) {
            onSendMessage(inputText);
            setInputText('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex-1 h-full flex flex-col bg-[#efeae2] dark:bg-[#0b141a] relative">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-[0.4] pointer-events-none" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")' }}></div>

            {/* Header */}
            <div className="h-[60px] px-4 py-2.5 flex justify-between items-center bg-[#f0f2f5] dark:bg-[#202c33] border-l border-[#d1d7db] dark:border-[#222d34] z-10 w-full shadow-sm">
                <div className="flex items-center gap-4 cursor-pointer">
                    <Avatar className="w-10 h-10">
                        <AvatarImage src={chat?.avatar} />
                        <AvatarFallback className="bg-[#dfe3e5] dark:bg-[#667781] text-white">
                            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"></path></svg>
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <span className="text-[#111b21] dark:text-[#e9edef] text-base leading-none mb-1 font-medium">
                            {chat?.name || 'Contact'}
                        </span>
                    </div>
                </div>
                <div className="flex gap-2 text-[#54656f] dark:text-[#aebac1]">
                    <Button variant="ghost" size="icon" className="hover:bg-black/5"><Search className="w-5 h-5" /></Button>
                    <Button variant="ghost" size="icon" className="hover:bg-black/5"><MoreVertical className="w-5 h-5" /></Button>
                </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 w-full bg-transparent z-10">
                <div className="p-[5%] pt-4 flex flex-col gap-1 min-h-0">
                    <div className="w-full text-center my-4 sticky top-2 z-20">
                        <span className="bg-white/90 dark:bg-[#111b21]/90 px-3 py-1.5 rounded-lg text-xs text-[#54656f] dark:text-[#8696a0] shadow-sm uppercase font-medium">Today</span>
                    </div>

                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'} mb-2 group`}
                        >
                            <div className={`
                     max-w-[65%] px-2 py-1.5 rounded-lg shadow-sm relative text-[14.2px] text-[#111b21] dark:text-[#e9edef] leading-[19px]
                     ${message.sender === 'me' ? 'bg-[#d9fdd3] dark:bg-[#005c4b] rounded-tr-none' : 'bg-white dark:bg-[#202c33] rounded-tl-none'}
                  `}>
                                {/* Tail (CSS Magic) */}
                                <span className={`absolute top-0 w-2 h-2 ${message.sender === 'me' ? '-right-2' : '-left-2'}`}>
                                    <svg viewBox="0 0 8 13" width="8" height="13" className={`
                           ${message.sender === 'me' ? 'fill-[#d9fdd3] dark:fill-[#005c4b]' : 'fill-white dark:fill-[#202c33]'}
                           ${message.sender === 'me' ? '' : 'transform scale-x-[-1]'}
                        `}>
                                        <path opacity=".13" d="M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1z"></path>
                                        <path d="M5.188 0H0v11.193l6.467-8.625C7.526 1.156 6.958 0 5.188 0z"></path>
                                    </svg>
                                </span>

                                <div className="px-1 pt-1 pb-4 whitespace-pre-wrap break-words">
                                    {message.text}
                                </div>

                                <div className="absolute right-2 bottom-1 flex items-center gap-1 select-none">
                                    <span className="text-[11px] text-[#667781] dark:text-[#8696a0] h-[15px]">{message.timestamp}</span>
                                    {message.sender === 'me' && (
                                        <div className={`
                              ${message.status === 'read' ? 'text-[#53bdeb]' : 'text-[#667781]'}
                           `}>
                                            <svg viewBox="0 0 16 11" width="16" height="11" fill="currentColor"><path d="M12.157 1.638L9.897 11h-1.6l2.16-8.948-.052.05-.006.007c-1.332 1.488-2.64 2.859-3.955 4.316l-.01.011L4.856 8.16l-.004.004-1.921 2.05L.892 8.18l3.664-3.896.012-.014.01-.01C5.9 2.827 7.23 1.464 8.57 0h2.48l1.107 1.638zM16 1.637L13.74 11h-1.6l2.16-8.948-.02.02c-1.353 1.503-2.68 2.888-4.016 4.356l-1.579 1.734 1.791-2.13.013-.016.013-.014C11.854 4.544 13.2 3.096 14.54 1.637H16z"></path></svg>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="min-h-[62px] bg-[#f0f2f5] dark:bg-[#202c33] px-2 py-2 flex items-center gap-1 z-10 border-t border-[#d1d7db] dark:border-[#222d34]">
                <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="text-[#54656f] dark:text-[#aebac1] hover:bg-black/5"><Smile className="w-6 h-6" /></Button>
                    <Button variant="ghost" size="icon" className="text-[#54656f] dark:text-[#aebac1] hover:bg-black/5"><Paperclip className="w-6 h-6" /></Button>
                </div>

                <form onSubmit={handleSend} className="flex-1 mx-2">
                    <Input
                        type="text"
                        placeholder="Type a message"
                        className="w-full px-4 py-6 rounded-lg bg-white dark:bg-[#2a3942] text-[15px] text-[#111b21] dark:text-[#e9edef] placeholder:text-[#54656f] border-none shadow-none focus-visible:ring-0"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                </form>

                <div className="flex items-center">
                    {inputText.trim() ? (
                        <Button onClick={() => handleSend()} variant="ghost" size="icon" className="text-[#54656f] dark:text-[#aebac1] hover:bg-black/5">
                            <SendHorizontal className="w-6 h-6" />
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
}
