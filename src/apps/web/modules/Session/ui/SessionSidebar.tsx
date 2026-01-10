import { Session } from '../domain/Session';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Plus, Settings } from "lucide-react";

interface SessionSidebarProps {
    sessions: Session[];
    selectedSessionId: string | null;
    onSelectSession: (session: Session) => void;
    onCreateSession: () => void;
    userEmail: string;
}

export default function SessionSidebar({
    sessions,
    selectedSessionId,
    onSelectSession,
    onCreateSession,
    userEmail,
}: SessionSidebarProps) {
    return (
        <div className="w-[70px] bg-[#f0f2f5] dark:bg-[#111b21] border-r border-[#d1d7db] dark:border-[#202c33] flex flex-col items-center py-4 gap-4 z-20 h-full">
            {/* User Avatar (Top) */}
            <TooltipProvider>
                <Tooltip delayDuration={0}>
                    <TooltipTrigger>
                        <Avatar className="w-10 h-10 cursor-pointer hover:opacity-80 transition-opacity">
                            <AvatarImage src="" />
                            <AvatarFallback className="bg-[#dfe3e5] dark:bg-[#667781] text-white font-bold text-sm">
                                {userEmail[0].toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                        <p>{userEmail}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <Separator className="w-8 bg-[#d1d7db] dark:bg-[#202c33]" />

            {/* Sessions List */}
            <ScrollArea className="flex-1 w-full flex flex-col items-center px-0">
                <div className="flex flex-col items-center gap-3 py-2 w-full">
                    {sessions.map((session) => (
                        <TooltipProvider key={session.id}>
                            <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                    <div
                                        onClick={() => onSelectSession(session)}
                                        className={`relative group cursor-pointer transition-all duration-200 ${selectedSessionId === session.id
                                            ? 'opacity-100 scale-105'
                                            : 'opacity-70 hover:opacity-100 hover:scale-105'
                                            }`}
                                    >
                                        {/* Active Indicator Bar */}
                                        {selectedSessionId === session.id && (
                                            <div className="absolute -left-[18px] top-1/2 -translate-y-1/2 w-[4px] h-[24px] bg-[#00a884] rounded-r-md animate-in slide-in-from-left-1 duration-300"></div>
                                        )}

                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm overflow-hidden relative border-2 ${selectedSessionId === session.id ? 'border-[#00a884]' : 'border-transparent'
                                            } transition-all bg-[#dfe3e5] dark:bg-[#667781]`}>
                                            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" className="relative z-10"><path d="M12.001 2.002c-5.522 0-9.999 4.477-9.999 9.999 0 5.523 4.477 9.999 9.999 9.999 5.523 0 9.999-4.476 9.999-9.999 0-5.522-4.476-9.999-9.999-9.999zm0 18.498c-4.687 0-8.499-3.812-8.499-8.499 0-4.687 3.812-8.499 8.499-8.499s8.499 3.812 8.499 8.499-3.812 8.499-8.499 8.499z"></path></svg>
                                        </div>

                                        {/* Status Indicator Dot */}
                                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#f0f2f5] dark:border-[#111b21] flex items-center justify-center ${session.status === 'connected' ? 'bg-[#25D366]'
                                            : session.status === 'disconnected' ? 'bg-[#ef4444]'
                                                : 'bg-[#eab308]'
                                            }`}>
                                        </div>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent side="right">
                                    <p className="font-medium text-xs">{session.id}</p>
                                    <p className="text-[10px] opacity-70 capitalize">{session.status}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    ))}

                    {/* Create New Session Button */}
                    <TooltipProvider>
                        <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                                <Button
                                    onClick={onCreateSession}
                                    variant="outline"
                                    size="icon"
                                    className="w-12 h-12 rounded-full border-2 border-dashed border-[#54656f] dark:border-[#aebac1] text-[#54656f] dark:text-[#aebac1] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[#00a884] hover:border-[#00a884] dark:hover:border-[#00a884] dark:hover:text-[#00a884] transition-all mt-2 bg-transparent"
                                >
                                    <Plus className="w-6 h-6" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                                <p>New Session</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </ScrollArea>

            <Separator className="w-8 bg-[#d1d7db] dark:bg-[#202c33]" />

            {/* Settings / Bottom Actions */}
            <TooltipProvider>
                <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="w-10 h-10 text-[#54656f] dark:text-[#aebac1] hover:text-[#111b21] dark:hover:text-[#e9edef] hover:bg-transparent transition-colors">
                            <Settings className="w-6 h-6" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                        <p>Settings</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    );
}
