"use client";

import React, { useState, useMemo } from 'react';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, isToday 
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X, Trash2 } from 'lucide-react';

// =========================================
// KOMPONEN MODAL TERPISAH (KUNCI ANTI-LAG)
// Karena state ketikan ada di sini, kalender utama tidak akan ikut re-render!
// =========================================
const EventModal = ({ onClose, onSave, onDelete, initialData, selectedDate }) => {
  // State form terisolasi di dalam Modal
  const [title, setTitle] = useState(initialData ? initialData.title : '');
  const [time, setTime] = useState(initialData ? initialData.time : '');
  const [location, setLocation] = useState(initialData ? initialData.location : '');
  const [colorTheme, setColorTheme] = useState(initialData ? initialData.colorTheme : 'yellow');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ title, time, location, colorTheme });
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 w-screen h-screen">
      <div className="bg-white border-[3px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-sm p-5 sm:p-6 animate-in zoom-in duration-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg sm:text-xl font-black uppercase text-black">
            {initialData ? 'Edit' : 'Add to'} <span className="text-[#FFC107] bg-black px-2 py-1 ml-1">{format(selectedDate, 'MMM dd')}</span>
          </h2>
          <button type="button" onClick={onClose} className="hover:bg-red-100 p-1 border-2 border-transparent hover:border-black transition-all">
            <X className="w-5 h-5 sm:w-6 sm:h-6 text-black" strokeWidth={3} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Input Title */}
          <div>
            <label className="block text-[10px] sm:text-xs font-black uppercase mb-1">Task Title</label>
            <input 
              type="text" required
              placeholder="e.g. Physics Lab Report"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#EEF6F6] border-[2px] sm:border-[3px] border-black p-2 sm:p-3 font-bold text-sm outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:-translate-y-1 transition-all"
            />
          </div>

          {/* Time & Location Grid */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-[10px] sm:text-xs font-black uppercase mb-1">Time</label>
              {/* Input khusus Waktu */}
              <input 
                type="time" 
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-white border-[2px] sm:border-[3px] border-black p-2 font-bold text-sm outline-none focus:bg-[#EEF6F6] cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-[10px] sm:text-xs font-black uppercase mb-1">Location</label>
              <input 
                type="text" placeholder="e.g. Online"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-white border-[2px] sm:border-[3px] border-black p-2 font-bold text-sm outline-none focus:bg-[#EEF6F6]"
              />
            </div>
          </div>

          {/* Color Labels */}
          <div>
            <label className="block text-[10px] sm:text-xs font-black uppercase mb-2">Color Label</label>
            <div className="flex gap-2 sm:gap-3">
              {['yellow', 'mint', 'pink', 'blue'].map((color) => (
                <div 
                  key={color}
                  onClick={() => setColorTheme(color)}
                  className={`w-7 h-7 sm:w-8 sm:h-8 cursor-pointer border-[2px] sm:border-[3px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all
                    ${color === 'yellow' ? 'bg-[#FFC107]' : color === 'mint' ? 'bg-[#5EEAD4]' : color === 'pink' ? 'bg-[#FFA6D6]' : 'bg-[#A3C4FF]'}
                    ${colorTheme === color ? 'ring-2 sm:ring-4 ring-black ring-offset-2' : ''}
                  `}
                />
              ))}
            </div>
          </div>

          {/* Buttons (Save & Delete) */}
          <div className="flex gap-2 sm:gap-3 mt-4">
            {initialData && (
              <button 
                type="button"
                onClick={onDelete}
                className="flex items-center justify-center bg-[#FFB3C1] hover:bg-red-400 border-[2px] sm:border-[3px] border-black p-2 sm:p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
              >
                <Trash2 className="w-5 h-5 text-black" strokeWidth={2.5} />
              </button>
            )}
            <button 
              type="submit"
              className="flex-1 bg-[#B3FFB3] hover:bg-[#8FFFE1] border-[2px] sm:border-[3px] border-black p-2 sm:p-3 font-black text-sm sm:text-lg uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
            >
              {initialData ? 'Save Changes' : 'Add Deadline'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =========================================
// KOMPONEN KALENDER UTAMA
// =========================================
const CustomCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [events, setEvents] = useState([
    {
      id: 1,
      date: new Date(currentDate.getFullYear(), currentDate.getMonth(), 7), 
      title: 'Calculus Midterm',
      time: '10:00',
      location: 'ROOM 302',
      style: 'bg-white', 
      tagStyle: 'bg-[#FFC107] text-black', 
      tagText: 'CALCULUS',
      hasNotification: true
    },
    {
      id: 2,
      date: new Date(currentDate.getFullYear(), currentDate.getMonth(), 10),
      title: 'History Paper Due',
      time: '23:59',
      location: 'ONLINE',
      style: 'bg-[#5EEAD4]',
      tagStyle: 'bg-white text-black',
      tagText: 'HISTORY',
      hasNotification: false
    }
  ]);

  const [modalState, setModalState] = useState({
    isOpen: false,
    selectedDate: null,
    editingEventId: null,
    initialData: null
  });

  const themeOptions = {
    yellow: { style: 'bg-white', tagStyle: 'bg-[#FFC107] text-black' },
    mint: { style: 'bg-[#5EEAD4]', tagStyle: 'bg-white text-black' },
    pink: { style: 'bg-[#FFA6D6]', tagStyle: 'bg-white text-black' },
    blue: { style: 'bg-[#A3C4FF]', tagStyle: 'bg-white text-black' }
  };

  const eventsByDate = useMemo(() => {
    const dict = {};
    events.forEach(ev => {
      const dateStr = format(ev.date, 'yyyy-MM-dd');
      if (!dict[dateStr]) dict[dateStr] = [];
      dict[dateStr].push(ev);
    });
    return dict;
  }, [events]);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const handleCellClick = (day, existingEvent) => {
    if (existingEvent) {
      let themeKey = 'yellow';
      if (existingEvent.style.includes('5EEAD4')) themeKey = 'mint';
      if (existingEvent.style.includes('FFA6D6')) themeKey = 'pink';
      if (existingEvent.style.includes('A3C4FF')) themeKey = 'blue';

      setModalState({
        isOpen: true,
        selectedDate: day,
        editingEventId: existingEvent.id,
        initialData: {
          title: existingEvent.title,
          time: existingEvent.time,
          location: existingEvent.location,
          colorTheme: themeKey
        }
      });
    } else {
      setModalState({
        isOpen: true,
        selectedDate: day,
        editingEventId: null,
        initialData: null
      });
    }
  };

  const handleSaveEvent = (eventData) => {
    const theme = themeOptions[eventData.colorTheme];
    
    if (modalState.editingEventId) {
      setEvents(events.map(ev => ev.id === modalState.editingEventId ? {
        ...ev,
        title: eventData.title,
        time: eventData.time || '--:--',
        location: eventData.location || 'Anywhere',
        style: theme.style,
        tagStyle: theme.tagStyle,
        tagText: eventData.title.substring(0, 8).toUpperCase(),
      } : ev));
    } else {
      const newEntry = {
        id: Date.now(),
        date: modalState.selectedDate,
        title: eventData.title,
        time: eventData.time || '--:--',
        location: eventData.location || 'Anywhere',
        style: theme.style,
        tagStyle: theme.tagStyle,
        tagText: eventData.title.substring(0, 8).toUpperCase(),
        hasNotification: true
      };
      setEvents([...events, newEntry]);
    }
    setModalState({ ...modalState, isOpen: false });
  };

  const handleDeleteEvent = () => {
    setEvents(events.filter(ev => ev.id !== modalState.editingEventId));
    setModalState({ ...modalState, isOpen: false });
  };

  const calendarGrid = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); 

    const rows = [];
    let day = startDate;

    // KUNCI ANTI-NAIK-TURUN: Selalu paksa render tepat 6 baris (6 minggu x 7 hari = 42 hari)
    for (let week = 0; week < 6; week++) {
      let days = [];
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        const formattedDate = format(cloneDay, "d");
        const dateStr = format(cloneDay, 'yyyy-MM-dd');
        
        const dayEvents = eventsByDate[dateStr] || [];
        const currentEvent = dayEvents.length > 0 ? dayEvents[0] : null;
        
        const isCurrentMonth = isSameMonth(cloneDay, monthStart);
        const isDayToday = isToday(cloneDay);

        days.push(
          <div 
            key={cloneDay.toString()} 
            onClick={() => isCurrentMonth && handleCellClick(cloneDay, currentEvent)}
            className={`relative flex flex-col p-1 sm:p-2 min-h-[3.5rem] sm:min-h-[5rem] md:min-h-[6rem] transition-all 
              ${!isCurrentMonth ? 'text-gray-300 pointer-events-none' : 'text-black cursor-pointer hover:-translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'}
              ${isDayToday && !currentEvent ? 'bg-[#2D3748] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-[2px] sm:border-[3px] border-black' : ''}
              ${currentEvent ? `border-[2px] sm:border-[3px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${currentEvent.style}` : ''}
              ${!currentEvent && !isDayToday && isCurrentMonth ? 'border border-transparent hover:border-black' : ''}
            `}
          >
            <span className={`font-bold text-xs sm:text-base ${isDayToday && !currentEvent ? 'text-white' : 'text-black'}`}>
              {formattedDate}
            </span>
            
            {isDayToday && !currentEvent && (
              <span className="hidden sm:block text-[9px] font-bold text-gray-300 mt-1 uppercase">Today</span>
            )}

            {currentEvent && (
              <div className={`mt-auto w-full border-[1.5px] sm:border-2 border-black px-0.5 py-[1px] sm:p-0.5 text-[7px] sm:text-[9px] leading-none font-black truncate ${currentEvent.tagStyle}`}>
                {currentEvent.tagText}
              </div>
            )}

            {currentEvent?.hasNotification && (
              <div className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 w-2.5 h-2.5 sm:w-4 sm:h-4 bg-red-500 border-[1.5px] sm:border-2 border-black rounded-full" />
            )}
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7 gap-1 sm:gap-2 lg:gap-4 mb-1 sm:mb-2 lg:mb-4 w-full" key={week}>
          {days}
        </div>
      );
    }
    return rows;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, eventsByDate]);

  const currentMonthEvents = events.filter(e => isSameMonth(e.date, currentDate)).sort((a, b) => a.date - b.date);

  return (
    <div className="relative w-full h-full bg-white border-[2px] sm:border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-sans flex flex-col">
      
      {/* HEADER KALENDER */}
      <div className="bg-[#EEF6F6] border-b-[2px] sm:border-b-[3px] border-black p-3 sm:p-4 flex items-center justify-between">
        <h2 className="text-base sm:text-xl font-black text-black tracking-wide uppercase truncate">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        {/* ... tombol panah ... */}
        <div className="flex gap-1.5 sm:gap-2 shrink-0">
          <button onClick={prevMonth} className="bg-white border-[2px] sm:border-[3px] border-black p-1 hover:bg-gray-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all">
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-black" strokeWidth={3} />
          </button>
          <button onClick={nextMonth} className="bg-white border-[2px] sm:border-[3px] border-black p-1 hover:bg-gray-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all">
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-black" strokeWidth={3} />
          </button>
        </div>
      </div>

      {/* BODY KALENDER */}
      <div className="p-2 sm:p-4 flex-none">
        <div className="grid grid-cols-7 gap-1 sm:gap-2 lg:gap-4 mb-2 sm:mb-4">
          {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((dayName) => (
            <div key={dayName} className="text-center text-[8px] sm:text-[10px] font-black text-gray-400 tracking-wider">
              {dayName}
            </div>
          ))}
        </div>
        <div>{calendarGrid}</div>
      </div>

      {/* UPCOMING DEADLINES SECTION */}
      <div className="mt-auto p-3 sm:p-4 border-t-[2px] sm:border-t-[3px] border-black bg-white">
        <div className="flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4 text-black">
          <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />
          <h3 className="text-xs sm:text-sm font-black tracking-wide uppercase">Upcoming Deadlines</h3>
        </div>

        <div className="flex flex-col gap-2 sm:gap-3 max-h-[135px] sm:max-h-[150px] overflow-y-auto pr-2">
          {currentMonthEvents.map((event) => (
            <div key={event.id} onClick={() => handleCellClick(event.date, event)} className="flex bg-[#EEF6F6] border-[2px] sm:border-[3px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] shrink-0 cursor-pointer hover:-translate-y-0.5 transition-transform">
              <div className="bg-white border-r-[2px] sm:border-r-[3px] border-black p-2 flex flex-col items-center justify-center min-w-[50px] sm:min-w-[65px]">
                <span className="text-[8px] sm:text-[10px] font-black text-black uppercase">{format(event.date, 'MMM')}</span>
                <span className="text-sm sm:text-xl font-black text-black">{format(event.date, 'dd')}</span>
              </div>
              <div className="p-2 sm:p-3 flex flex-col justify-center bg-white w-full">
                <h4 className="font-bold text-[10px] sm:text-sm text-black leading-tight mb-0.5">{event.title}</h4>
                <p className="text-[8px] sm:text-[10px] font-bold text-gray-500 tracking-wide uppercase">
                  {event.time} • {event.location}
                </p>
              </div>
            </div>
          ))}
          {currentMonthEvents.length === 0 && (
            <div className="text-[10px] sm:text-xs font-bold text-gray-400 p-3 border-2 border-dashed border-gray-300 w-full text-center shrink-0">
              No deadlines this month! 🎉
            </div>
          )}
        </div>
      </div>

      {/* RENDER MODAL TERPISAH */}
      {modalState.isOpen && (
        <EventModal 
          selectedDate={modalState.selectedDate}
          initialData={modalState.initialData}
          onClose={() => setModalState({ ...modalState, isOpen: false })}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
        />
      )}

    </div>
  );
};

export default CustomCalendar;