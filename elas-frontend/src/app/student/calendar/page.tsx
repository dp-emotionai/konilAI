"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/cn";
import { getStudentSessionsList, type StudentSessionRow } from "@/lib/api/student";
import { getApiBaseUrl, hasAuth } from "@/lib/api/client";
import { 
  CalendarDays, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  MapPin, 
  VideoIcon,
  HelpCircle
} from "lucide-react";

const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
];
const DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export default function StudentCalendarPage() {
  const [sessions, setSessions] = useState<StudentSessionRow[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  const apiAvailable = getApiBaseUrl() && hasAuth();

  useEffect(() => {
    if (!apiAvailable) {
      setLoading(false);
      return;
    }
    
    getStudentSessionsList()
      .then(setSessions)
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, [apiAvailable]);

  // Calendar logic
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => {
    const t = new Date();
    setCurrentDate(new Date(t.getFullYear(), t.getMonth(), 1));
    setSelectedDate(t);
  };

  const isSessionInCurrentMonth = (s: StudentSessionRow) => {
    // If we parse real ISO date:
    // const d = new Date(s.date);
    // return d.getMonth() === month && d.getFullYear() === year;
    return true; // Simplified: assume all returned sessions are for this time or just parse raw strings
  };

  const getSessionsForDay = (day: number) => {
    return sessions.filter((s) => {
      const parsedDay = s.date?.match(/(\d{1,2})\s/);
      if (parsedDay && parseInt(parsedDay[1], 10) === day) return true;
      return false;
    });
  };

  const unscheduledSessions = sessions.filter((s) => {
    const parsedDay = s.date?.match(/(\d{1,2})\s/);
    return !parsedDay;
  });

  const selectedDaySessions = getSessionsForDay(selectedDate.getDate());

  return (
    <div className="min-h-screen bg-[#FAFAFB]">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8 py-8 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Календарь
            </h1>
            <p className="mt-1.5 text-[15px] text-slate-500">
              Ваше расписание
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={goToday}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-[13px] font-medium rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
            >
              Сегодня
            </button>
            <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
              <button onClick={prevMonth} className="px-2 py-1 text-slate-600 hover:bg-slate-50 rounded-lg"><ChevronLeft size={18} /></button>
              <button onClick={nextMonth} className="px-2 py-1 text-slate-600 hover:bg-slate-50 rounded-lg"><ChevronRight size={18} /></button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] 2xl:grid-cols-[1fr_400px] gap-8 items-start">
          
          {/* Calendar Grid */}
          <div className="bg-white border border-slate-100 rounded-[24px] shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between">
               <h2 className="text-xl font-bold text-slate-900">
                 {MONTHS[month]} <span className="text-slate-400 font-medium ml-1">{year}</span>
               </h2>
               {loading && <div className="text-xs text-[#7448FF] font-medium animate-pulse">Синхронизация...</div>}
            </div>

            <div className="grid grid-cols-7 border-b border-slate-50 bg-slate-50/50">
               {DAYS.map(d => (
                 <div key={d} className="py-3 text-center text-[12px] font-semibold text-slate-500 uppercase tracking-widest px-2 truncate">
                   {d}
                 </div>
               ))}
            </div>

            <div className="grid grid-cols-7 flex-1 auto-rows-[minmax(120px,1fr)] bg-slate-100 gap-[1px]">
               {Array.from({ length: startOffset }).map((_, i) => (
                 <div key={`empty-${i}`} className="bg-white opacity-50 p-2 pointer-events-none"></div>
               ))}
               
               {Array.from({ length: daysInMonth }).map((_, i) => {
                 const day = i + 1;
                 const isSelected = selectedDate.getDate() === day && selectedDate.getMonth() === month && selectedDate.getFullYear() === year;
                 const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
                 const daySessions = getSessionsForDay(day);

                 return (
                   <div 
                     key={day} 
                     onClick={() => setSelectedDate(new Date(year, month, day))}
                     className={cn(
                       "bg-white p-3 md:p-4 hover:bg-slate-50 transition-colors cursor-pointer group flex flex-col gap-2 min-w-0 border border-transparent",
                       isSelected && "border-[#7448FF]/30 bg-purple-50/10 shadow-[inset_0_0_0_1px_rgba(116,72,255,0.2)]"
                     )}
                   >
                     <div className="flex items-center justify-between">
                       <span className={cn(
                         "flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors",
                         isSelected ? "bg-[#7448FF] text-white" : isToday ? "bg-purple-100 text-purple-700" : "text-slate-700 group-hover:bg-slate-100"
                       )}>
                         {day}
                       </span>
                       {daySessions.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-[#7448FF]"></span>}
                     </div>

                     <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-1.5 flex flex-col justify-end xl:justify-start">
                        {daySessions.slice(0, 3).map(s => (
                          <div key={s.id} className={cn("px-2 py-1.5 rounded-lg text-[11px] font-medium truncate",
                             s.status === 'live' ? "bg-emerald-50 text-emerald-700" :
                             s.status === 'upcoming' ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"
                          )}>
                             {s.title}
                          </div>
                        ))}
                        {daySessions.length > 3 && (
                          <div className="text-[10px] font-semibold text-slate-400 pl-1">
                            +{daySessions.length - 3} еще
                          </div>
                        )}
                     </div>
                   </div>
                 );
               })}
               
               {Array.from({ length: Math.max(0, 42 - (startOffset + daysInMonth)) }).map((_, i) => (
                 <div key={`empty-end-${i}`} className="bg-white opacity-50 p-2 pointer-events-none"></div>
               ))}
            </div>
          </div>

          <div className="flex flex-col gap-6 sticky top-24 pb-12">
            {/* Sidebar Selected Day */}
            <div className="bg-white border text-sm border-slate-100 rounded-[24px] shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col h-[400px]">
               <div className="p-6 pb-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                  <h3 className="text-lg font-bold text-slate-900">События на {selectedDate.getDate()} {MONTHS[selectedDate.getMonth()].toLowerCase()}</h3>
                  <span className="w-8 h-8 rounded-full bg-white flex items-center justify-center font-bold text-purple-600 shadow-sm">{selectedDaySessions.length}</span>
               </div>

               <div className="p-6 flex-1 overflow-y-auto no-scrollbar relative min-h-0">
                 {selectedDaySessions.length > 0 ? (
                   <div className="space-y-4 relative">
                     <div className="absolute left-[15px] top-4 bottom-4 w-px bg-slate-100"></div>
                     {selectedDaySessions.map(s => (
                       <div key={s.id} className="relative pl-10 group">
                         <div className={cn("absolute left-0 mt-1 w-8 h-8 rounded-full flex items-center justify-center shadow-sm",
                           s.status === 'live' ? 'bg-emerald-500 text-white' : s.status === 'upcoming' ? 'bg-amber-400 text-white' : 'bg-slate-200 text-slate-500'
                         )}>
                           <VideoIcon size={14} strokeWidth={3} />
                         </div>
                         
                         <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm group-hover:shadow-md transition-shadow">
                            <h4 className="font-semibold text-slate-900 mb-1">{s.title}</h4>
                            <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 text-[12px] text-slate-500 font-medium">
                              <span className="flex items-center gap-1.5"><Clock size={14} className="text-slate-400"/> {s.date || "Cегодня"}</span>
                              <span className="flex items-center gap-1.5"><MapPin size={14} className="text-slate-400"/> Онлайн</span>
                            </div>
                         </div>
                       </div>
                     ))}
                   </div>
                 ) : (
                   <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                      <CalendarDays size={48} strokeWidth={1} className="mb-4 text-slate-300" />
                      <p className="text-[15px] font-medium text-slate-600 mb-2">Напрямую на этот день расписания нет</p>
                   </div>
                 )}
               </div>
            </div>

            {/* Unscheduled / TBD sidebar block */}
            <div className="bg-white border border-slate-100 rounded-[24px] shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col min-h-[250px] max-h-[400px]">
                <div className="p-6 pb-4 border-b border-slate-50 flex items-center justify-between bg-purple-50/30">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <HelpCircle size={18} className="text-purple-500" /> 
                    Без точной даты
                  </h3>
                  <span className="text-xs font-semibold bg-white border border-purple-100 text-purple-700 px-2 py-1 rounded-lg">
                    {unscheduledSessions.length}
                  </span>
                </div>

                <div className="p-6 flex-1 overflow-y-auto no-scrollbar text-sm">
                  {unscheduledSessions.length > 0 ? (
                    <div className="space-y-3">
                      {unscheduledSessions.map(s => (
                        <div key={s.id} className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                          <div className="font-medium text-slate-800">{s.title}</div>
                          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                            <span className={cn("w-2 h-2 rounded-full",
                              s.status === 'live' ? 'bg-emerald-500' : s.status === 'upcoming' ? 'bg-amber-400' : 'bg-slate-300'
                            )}></span>
                            {s.status === 'live' ? 'Сейчас идет' : s.status === 'upcoming' ? 'Предстоит' : 'Завершено'}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center">
                      <p className="text-sm">Все сессии имеют дату</p>
                    </div>
                  )}
                </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
