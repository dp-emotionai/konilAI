"use client";

import { 
  MessageSquare, 
  Search, 
  Edit3,
  Inbox
} from "lucide-react";

export default function StudentMessagesPage() {
  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#FAFAFB] flex flex-col pt-16">
      <div className="flex-1 mx-auto w-full max-w-[1440px] flex h-[calc(100vh-64px)]">
        
        {/* Sidebar */}
        <div className="w-[320px] lg:w-[380px] border-r border-slate-200 bg-white flex flex-col shrink-0">
          <div className="p-4 md:p-6 pb-4 border-b border-slate-100 flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Сообщения
            </h1>
            <button className="w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-[#7448FF] transition-colors">
              <Edit3 size={18} />
            </button>
          </div>
          
          <div className="p-4 border-b border-slate-100">
            <div className="relative w-full">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Поиск сообщений..." 
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-transparent rounded-xl text-sm outline-none focus:bg-white focus:border-purple-500/30 focus:ring-4 focus:ring-purple-500/10 transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar relative flex flex-col items-center justify-center text-center p-6 text-slate-400">
             <Inbox size={48} strokeWidth={1} className="mb-4 text-slate-200" />
             <p className="text-[14px] font-medium text-slate-600 mb-1">Нет активных диалогов</p>
             <p className="text-xs">Начните чат с преподавателем или выберите диалог из истории.</p>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 bg-[#FAFAFB] hidden md:flex flex-col items-center justify-center text-center p-8">
           <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center text-[#7448FF] mb-6 border border-slate-100">
              <MessageSquare size={24} />
           </div>
           <h3 className="text-xl font-bold tracking-tight text-slate-900 mb-2">Ваши сообщения</h3>
           <p className="text-slate-500 text-[15px] max-w-sm">
             Здесь будут отображаться ваши личные переписки с преподавателями и одногруппниками.
           </p>
        </div>

      </div>
    </div>
  );
}
