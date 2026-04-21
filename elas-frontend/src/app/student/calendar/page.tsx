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
          
          {/* Main Space */}
          <div className="bg-white border border-slate-100 rounded-[24px] shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col p-12 text-center items-center justify-center min-h-[400px]">
            <CalendarDays size={48} className="text-slate-300 mb-4" />
             <h2 className="text-xl font-bold text-slate-900 mb-2">Календарь недоступен</h2>
             <p className="text-[14px] text-slate-500 max-w-md">Модуль интеграции с расписанием находится в разработке. Вы можете следить за своими активными сессиями на главной странице или в разделе Сессии.</p>
          </div>

          {/* Right Sidebar - All real sessions */}
          <div className="flex flex-col gap-6 sticky top-24 pb-12">
            
            {/* Real sessions summary */}
            <div className="bg-white border text-sm border-slate-100 rounded-[24px] shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col max-h-[500px]">
               <div className="p-6 pb-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                  <h3 className="text-lg font-bold text-slate-900">Ближайшие сессии</h3>
                  <span className="w-8 h-8 rounded-full bg-white flex items-center justify-center font-bold text-purple-600 shadow-sm">{sessions.length}</span>
               </div>

               <div className="p-6 flex-1 overflow-y-auto no-scrollbar relative min-h-[200px]">
                 {sessions.length > 0 ? (
                   <div className="space-y-4">
                     {sessions.map(s => (
                       <div key={s.id} className="relative group">
                         <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm group-hover:shadow-md transition-shadow">
                            <h4 className="font-semibold text-slate-900 mb-1">{s.title}</h4>
                            <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 text-[12px] text-slate-500 font-medium">
                              <span className="flex items-center gap-1.5"><Clock size={14} className="text-slate-400"/> {s.date || "Дата не указана"}</span>
                              <span className="flex items-center gap-1.5 capitalize text-purple-600">{s.status === "live" ? "Активная" : s.status === "upcoming" ? "Предстоит" : "Завершена"}</span>
                            </div>
                         </div>
                       </div>
                     ))}
                   </div>
                 ) : (
                   <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                      <p className="text-[15px] font-medium text-slate-600 mb-2">Нет предстоящих сессий</p>
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
