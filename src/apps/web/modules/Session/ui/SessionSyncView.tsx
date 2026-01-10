import { Session } from '../domain/Session';

interface SessionSyncViewProps {
    session: Session;
}

export default function SessionSyncView({ session }: SessionSyncViewProps) {
    const progress = session.syncProgress || 0;

    return (
        <div className="flex-1 h-full bg-white dark:bg-[#111b21] flex flex-col items-center justify-center relative overflow-hidden">
            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#00a884]/5 to-[#25d366]/5 dark:from-[#00a884]/10 dark:to-[#25d366]/10"></div>

            <div className="relative z-10 max-w-md w-full px-8 text-center">
                {/* Animated sync icon */}
                <div className="mb-8 flex justify-center">
                    <div className="relative">
                        <div className="w-24 h-24 rounded-full bg-[#00a884]/10 dark:bg-[#00a884]/20 flex items-center justify-center animate-pulse">
                            <svg className="w-12 h-12 text-[#00a884] animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        </div>
                        {/* Progress ring */}
                        <svg className="absolute inset-0 w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                            <circle
                                cx="50"
                                cy="50"
                                r="45"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="4"
                                className="text-[#d1d7db] dark:text-[#222d34]"
                            />
                            <circle
                                cx="50"
                                cy="50"
                                r="45"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="4"
                                strokeDasharray={`${2 * Math.PI * 45}`}
                                strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                                className="text-[#00a884] transition-all duration-500 ease-out"
                                strokeLinecap="round"
                            />
                        </svg>
                    </div>
                </div>

                {/* Title and percentage */}
                <h2 className="text-2xl font-light text-[#111b21] dark:text-[#e9edef] mb-2">
                    Syncing Your Chats
                </h2>
                <p className="text-4xl font-bold text-[#00a884] mb-6">
                    {Math.round(progress)}%
                </p>

                {/* Description */}
                <p className="text-sm text-[#54656f] dark:text-[#8696a0] mb-8">
                    We're downloading your chat history from WhatsApp.<br />
                    This may take a few moments...
                </p>

                {/* Progress bar */}
                <div className="w-full bg-[#f0f2f5] dark:bg-[#2a3942] rounded-full h-2 overflow-hidden shadow-inner">
                    <div
                        className="h-full bg-gradient-to-r from-[#00a884] to-[#25d366] transition-all duration-500 ease-out rounded-full shadow-lg"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Animated dots */}
                <div className="mt-6 flex justify-center gap-2">
                    <div className="w-2 h-2 bg-[#00a884] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-[#00a884] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-[#00a884] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
            </div>
        </div>
    );
}
