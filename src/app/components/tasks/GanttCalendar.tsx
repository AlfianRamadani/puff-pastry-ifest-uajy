"use client";

import React, { useState, useMemo, useRef } from 'react';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, 
  getDay, startOfDay
} from 'date-fns';
import { ChevronLeft, ChevronRight, X, Trash2 } from 'lucide-react';

// =========================================
// 1. EVENT MODAL (100% ANTI-LAG)
// - Terpisah dari kalender utama
// - Menggunakan useRef untuk mengetik
// - Menghapus backdrop-blur & transition di form
// =========================================
const GanttEventModal = ({ onClose, onSave, onDelete, initialData, defaultDate }: any) => {
  const titleRef = useRef<HTMLInputElement>(null);
  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);
  
  const [colorTheme, setColorTheme] = useState(initialData ? initialData.colorTheme : 'yellow');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const startDate = new Date(startDateRef.current!.value);
    const endDate = new Date(endDateRef.current!.value);

    if (endDate < startDate) {
      alert("End date cannot be earlier than start date!");
      return;
    }

    onSave({ 
      title: titleRef.current!.value, 
      startDate: startDate,
      endDate: endDate,
      colorTheme 
    });
  };

  const defaultStartStr = initialData ? format(initialData.startDate, 'yyyy-MM-dd') : format(defaultDate, 'yyyy-MM-dd');
  const defaultEndStr = initialData ? format(initialData.endDate, 'yyyy-MM-dd') : format(defaultDate, 'yyyy-MM-dd');

  return (
    // ANTI LAG FIX: Hapus backdrop-blur-sm, ganti jadi solid transparent black
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 p-4 w-screen h-screen">
      <div className="bg-white border-[3px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-sm p-5 sm:p-6 animate-in zoom-in duration-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg sm:text-xl font-black uppercase text-black">
            {initialData ? 'Edit Event' : 'New Event'}
          </h2>
          <button type="button" onClick={onClose} className="hover:bg-red-100 p-1 border-2 border-transparent hover:border-black transition-all">
            <X className="w-5 h-5 sm:w-6 sm:h-6 text-black" strokeWidth={3} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-black uppercase mb-1">Task Title</label>
            {/* ANTI LAG FIX: Hapus transition-all */}
            <input 
              type="text" required
              ref={titleRef}
              defaultValue={initialData ? initialData.title : ''}
              placeholder="e.g. Frontend Development"
              className="w-full bg-[#EEF6F6] border-[2px] sm:border-[3px] border-black p-2 sm:p-3 font-bold text-sm outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:-translate-y-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-black uppercase mb-1">Start Date</label>
              <input 
                type="date" required
                ref={startDateRef}
                defaultValue={defaultStartStr}
                className="w-full bg-white border-[2px] sm:border-[3px] border-black p-2 font-bold text-sm outline-none focus:bg-[#EEF6F6] cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase mb-1">End Date</label>
              <input 
                type="date" required
                ref={endDateRef}
                defaultValue={defaultEndStr}
                className="w-full bg-white border-[2px] sm:border-[3px] border-black p-2 font-bold text-sm outline-none focus:bg-[#EEF6F6] cursor-pointer"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase mb-2">Color Label</label>
            <div className="flex gap-2 sm:gap-3">
              {['yellow', 'mint', 'pink', 'blue'].map((color) => (
                <div 
                  key={color}
                  onClick={() => setColorTheme(color)}
                  className={`w-7 h-7 sm:w-8 sm:h-8 cursor-pointer border-[2px] sm:border-[3px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform
                    ${color === 'yellow' ? 'bg-[#FFC107]' : color === 'mint' ? 'bg-[#5EEAD4]' : color === 'pink' ? 'bg-[#FFA6D6]' : 'bg-[#A3C4FF]'}
                    ${colorTheme === color ? 'ring-2 sm:ring-4 ring-black ring-offset-2' : ''}
                  `}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2 sm:gap-3 mt-4">
            {initialData && (
              <button 
                type="button"
                onClick={onDelete}
                className="flex items-center justify-center bg-[#FFB3C1] hover:bg-red-400 border-[2px] sm:border-[3px] border-black p-2 sm:p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-transform"
              >
                <Trash2 className="w-5 h-5 text-black" strokeWidth={2.5} />
              </button>
            )}
            <button 
              type="submit"
              className="flex-1 bg-[#B3FFB3] hover:bg-[#8FFFE1] border-[2px] sm:border-[3px] border-black p-2 sm:p-3 font-black text-sm sm:text-lg uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-transform"
            >
              {initialData ? 'Save Changes' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =========================================
// 2. MAIN GANTT CALENDAR COMPONENT
// =========================================
const GanttCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date(2023, 9)); // Default Oct 2023

  const [events, setEvents] = useState([
    { id: 1, title: 'Kickoff', startDate: new Date(2023, 9, 2), endDate: new Date(2023, 9, 3), colorTheme: 'yellow' },
    { id: 2, title: 'Sync', startDate: new Date(2023, 9, 6), endDate: new Date(2023, 9, 6), colorTheme: 'mint' },
    { id: 3, title: 'PRs', startDate: new Date(2023, 9, 11), endDate: new Date(2023, 9, 13), colorTheme: 'yellow' },
    { id: 4, title: 'UI Kit', startDate: new Date(2023, 9, 17), endDate: new Date(2023, 9, 19), colorTheme: 'yellow' },
    { id: 5, title: 'v1.0 Release', startDate: new Date(2023, 9, 24), endDate: new Date(2023, 9, 25), colorTheme: 'mint' },
    { id: 6, title: 'Party', startDate: new Date(2023, 9, 31), endDate: new Date(2023, 9, 31), colorTheme: 'yellow' },
  ]);

  const [modalState, setModalState] = useState({
    isOpen: false,
    selectedDate: new Date(),
    editingEventId: null as number | null,
    initialData: null as any
  });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const handleDateClick = (day: Date) => {
    setModalState({ isOpen: true, selectedDate: day, editingEventId: null, initialData: null });
  };

  const handleEventClick = (e: React.MouseEvent, event: any) => {
    e.stopPropagation(); 
    setModalState({ isOpen: true, selectedDate: event.startDate, editingEventId: event.id, initialData: event });
  };

  const handleSaveEvent = (eventData: any) => {
    if (modalState.editingEventId) {
      setEvents(events.map(ev => ev.id === modalState.editingEventId ? { ...ev, ...eventData } : ev));
    } else {
      setEvents([...events, { id: Date.now(), ...eventData }]);
    }
    setModalState({ ...modalState, isOpen: false });
  };

  const handleDeleteEvent = () => {
    setEvents(events.filter(ev => ev.id !== modalState.editingEventId));
    setModalState({ ...modalState, isOpen: false });
  };

  const calendarWeeks = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); 

    const weeks = [];
    let day = startDate;

    for (let week = 0; week < 6; week++) {
      let days = [];
      for (let i = 0; i < 7; i++) {
        days.push(day);
        day = addDays(day, 1);
      }
      weeks.push(days);
    }
    return weeks;
  }, [currentDate]);

  const getThemeColor = (theme: string) => {
    switch(theme) {
      case 'yellow': return 'bg-[#FFC107]';
      case 'mint': return 'bg-[#5EEAD4]';
      case 'pink': return 'bg-[#FFA6D6]';
      case 'blue': return 'bg-[#A3C4FF]';
      default: return 'bg-[#FFC107]';
    }
  };

  return (
    <div className="bg-white w-full font-sans mb-10">
      
      {/* HEADER */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="text-xl sm:text-3xl font-black text-black tracking-tighter uppercase">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        <div className="flex gap-1 sm:gap-2 shrink-0">
          <button onClick={prevMonth} className="bg-white border-[2px] sm:border-[3px] border-black p-1 hover:bg-gray-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all">
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-black" strokeWidth={3} />
          </button>
          <button onClick={nextMonth} className="bg-white border-[2px] sm:border-[3px] border-black p-1 hover:bg-gray-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all">
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-black" strokeWidth={3} />
          </button>
        </div>
      </div>

      {/* CALENDAR GRID (MOBILE OPTIMIZED) */}
      <div className="bg-white border-[3px] sm:border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col">
        
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b-[2px] sm:border-b-[4px] border-black bg-white">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((dayName, idx) => (
            <div 
              key={idx} 
              // Ukuran font dan padding sangat kecil di mobile agar tidak sumpek
              className={`py-1.5 sm:py-3 text-center text-[10px] sm:text-sm font-black border-r-[1.5px] sm:border-r-[3px] border-black last:border-r-0 
                ${idx === 0 || idx === 6 ? 'text-[#FF4D4D]' : 'text-black'}`}
            >
              {dayName}
            </div>
          ))}
        </div>

        {/* Calendar Body */}
        {calendarWeeks.map((week, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-7 border-b-[1.5px] sm:border-b-[3px] border-black last:border-b-0">
            {week.map((day, dayIdx) => {
              const currentDayStart = startOfDay(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const dayOfWeek = getDay(day);
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

              const dayEvents = events.filter(e => {
                return currentDayStart >= startOfDay(e.startDate) && currentDayStart <= startOfDay(e.endDate);
              });

              return (
                <div 
                  key={day.toString()} 
                  onClick={() => handleDateClick(day)}
                  // Tinggi minimal dikurangi secara dramatis untuk mobile (min-h-[50px])
                  className={`relative min-h-[50px] sm:min-h-[100px] border-r-[1.5px] sm:border-r-[3px] border-black last:border-r-0 py-0.5 sm:py-1 flex flex-col gap-0.5 sm:gap-1 cursor-pointer transition-colors
                    ${!isCurrentMonth ? 'bg-gray-100/50' : 'bg-white hover:bg-gray-50'}
                  `}
                >
                  <span className={`text-center font-bold text-[9px] sm:text-sm mb-0.5 sm:mb-1
                    ${!isCurrentMonth ? 'text-gray-300' : isWeekend ? 'text-[#FF4D4D]' : 'text-black'}
                  `}>
                    {format(day, 'd')}
                  </span>

                  <div className="flex flex-col gap-[1px] sm:gap-1 w-full mt-auto mb-0.5 sm:mb-1">
                    {dayEvents.map(event => {
                      const isStart = isSameDay(day, event.startDate);
                      const isEnd = isSameDay(day, event.endDate);
                      const bgColor = getThemeColor(event.colorTheme);

                      return (
                        <div 
                          key={event.id}
                          onClick={(e) => handleEventClick(e, event)}
                          // Pil Gantt diekstrim-kecilkan di mobile (text-[6px], py-[1px]) agar muat ditumpuk
                          className={`
                            ${bgColor} border-y-[1.5px] sm:border-y-[2px] border-black text-[6px] sm:text-xs font-black text-black px-0.5 sm:px-1 py-[1px] sm:py-0.5 truncate hover:brightness-95
                            ${isStart ? 'border-l-[1.5px] sm:border-l-[2px] ml-0.5 sm:ml-1' : '-ml-[1.5px] sm:-ml-[2px]'} 
                            ${isEnd ? 'border-r-[1.5px] sm:border-r-[2px] mr-0.5 sm:mr-1' : '-mr-[1.5px] sm:-mr-[2px]'}
                          `}
                          title={event.title}
                        >
                          {isStart || dayOfWeek === 0 ? event.title : '\u00A0'}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* RENDER MODAL */}
      {modalState.isOpen && (
        <GanttEventModal 
          defaultDate={modalState.selectedDate}
          initialData={modalState.initialData}
          onClose={() => setModalState({ ...modalState, isOpen: false })}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
        />
      )}
    </div>
  );
};

export default GanttCalendar;