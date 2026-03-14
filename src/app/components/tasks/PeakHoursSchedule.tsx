"use client";

import React, { useState, useRef } from "react";
// Hapus ChevronLeft dan ChevronRight dari import
import { X, Trash2 } from "lucide-react";

// =========================================
// 1. SCHEDULE MODAL (ZERO-LAG)
// =========================================
const ScheduleModal = ({ onClose, onSave, onDelete, initialData, defaultDay, defaultTime }: any) => {
  const courseRef = useRef<HTMLInputElement>(null);
  const [eventType, setEventType] = useState(initialData ? initialData.type : 'major');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let color = "bg-[#FFC107]"; 
    if (eventType === "elective") color = "bg-[#B3D4FF]";
    if (eventType === "seminar") color = "bg-[#FFA6D6]";
    if (eventType === "lab") color = "bg-[#5EEAD4]";

    onSave({
      course: courseRef.current!.value,
      type: eventType,
      color: color,
      day: defaultDay,
      time: defaultTime
    });
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 p-4 w-screen h-screen">
      <div className="bg-white border-[3px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-sm p-5 sm:p-6 animate-in zoom-in duration-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-black uppercase text-black">
            {initialData ? 'Edit Class' : 'Add Class'} 
            <span className="block text-xs text-gray-500 mt-1">Day {defaultDay} at {defaultTime}</span>
          </h2>
          <button type="button" onClick={onClose} className="hover:bg-red-100 p-1 border-2 border-transparent hover:border-black transition-all">
            <X className="w-5 h-5 text-black" strokeWidth={3} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-black uppercase mb-1">Course / Activity Name</label>
            <input 
              type="text" required
              ref={courseRef}
              defaultValue={initialData ? initialData.course : ''}
              placeholder="e.g. Data Structures"
              className="w-full bg-[#EEF6F6] border-[3px] border-black p-2 font-bold text-sm outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:-translate-y-1"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase mb-2">Activity Type</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "major", label: "Major Course", bg: "bg-[#FFC107]" },
                { id: "elective", label: "Elective", bg: "bg-[#B3D4FF]" },
                { id: "seminar", label: "Seminar", bg: "bg-[#FFA6D6]" },
                { id: "lab", label: "Lab / Practicum", bg: "bg-[#5EEAD4]" },
              ].map((type) => (
                <div 
                  key={type.id}
                  onClick={() => setEventType(type.id)}
                  className={`cursor-pointer border-[3px] border-black p-2 flex items-center gap-2 hover:-translate-y-1 transition-transform shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
                    ${eventType === type.id ? 'ring-2 ring-black ring-offset-1' : ''}
                  `}
                >
                  <div className={`w-3 h-3 border-[2px] border-black ${type.bg}`} />
                  <span className="font-black text-[9px] uppercase">{type.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            {initialData && (
              <button 
                type="button"
                onClick={onDelete}
                className="flex items-center justify-center bg-[#FFB3C1] hover:bg-red-400 border-[3px] border-black p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              >
                <Trash2 className="w-5 h-5 text-black" strokeWidth={2.5} />
              </button>
            )}
            <button 
              type="submit"
              className="flex-1 bg-[#B3FFB3] hover:bg-[#8FFFE1] border-[3px] border-black p-2 font-black text-sm uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              {initialData ? 'Save' : 'Add to Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =========================================
// 2. MAIN PEAK HOURS COMPONENT
// =========================================
const PeakHoursSchedule = () => {
  const timeSlots = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];
  const todayIndex = new Date().getDay(); 

  const days = [
    { id: 1, name: "MON", isToday: todayIndex === 1 },
    { id: 2, name: "TUE", isToday: todayIndex === 2 },
    { id: 3, name: "WED", isToday: todayIndex === 3 },
    { id: 4, name: "THU", isToday: todayIndex === 4 },
    { id: 5, name: "FRI", isToday: todayIndex === 5 },
    { id: 6, name: "SAT", isToday: todayIndex === 6 },
    { id: 7, name: "SUN", isToday: todayIndex === 0 },
  ];

  const [scheduleData, setScheduleData] = useState([
    { id: 1, day: 1, time: "08:00", course: "ALGORITHM", type: "major", color: "bg-[#FFC107]" },
    { id: 2, day: 3, time: "10:00", course: "CALCULUS", type: "major", color: "bg-[#FFC107]" },
    { id: 3, day: 2, time: "13:00", course: "WEB DEV LAB", type: "lab", color: "bg-[#5EEAD4]" },
    { id: 4, day: 5, time: "10:00", course: "TECH SEMINAR", type: "seminar", color: "bg-[#FFA6D6]" },
  ]);

  const [modalState, setModalState] = useState({
    isOpen: false,
    dayId: null as number | null,
    time: null as string | null,
    editingId: null as number | null,
    initialData: null as any
  });

  const getEvent = (dayId: number, time: string) => {
    return scheduleData.find((s) => s.day === dayId && s.time === time);
  };

  const handleCellClick = (dayId: number, time: string, existingEvent: any) => {
    setModalState({
      isOpen: true,
      dayId: dayId,
      time: time,
      editingId: existingEvent ? existingEvent.id : null,
      initialData: existingEvent || null
    });
  };

  const handleSaveEvent = (data: any) => {
    if (modalState.editingId) {
      setScheduleData(scheduleData.map(ev => ev.id === modalState.editingId ? { ...ev, ...data } : ev));
    } else {
      setScheduleData([...scheduleData, { id: Date.now(), ...data }]);
    }
    setModalState({ ...modalState, isOpen: false });
  };

  const handleDeleteEvent = () => {
    setScheduleData(scheduleData.filter(ev => ev.id !== modalState.editingId));
    setModalState({ ...modalState, isOpen: false });
  };

  return (
    <div className="w-full bg-[#EEF6F6] p-4 sm:p-6 border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-sans">
      
      {/* HEADER: Tombol navigasi sudah dihapus */}
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-3xl font-black text-black uppercase tracking-tighter">
          Estimation of Peak Hours
        </h2>
      </div>

      {/* TABEL JADWAL (Horizontal Scrollable for Mobile) */}
      <div className="w-full overflow-x-auto bg-white border-[3px] border-black scrollbar-hide">
        <div className="min-w-[750px]">
          
          {/* Header Baris Hari (MON-SUN) dengan z-20 */}
          <div className="grid grid-cols-[70px_repeat(7,1fr)] border-b-[3px] border-black bg-white sticky top-0 z-20">
            <div className="border-r-[3px] border-black p-2 bg-gray-100 sticky left-0 z-30"></div> 
            {days.map((day) => (
              <div 
                key={day.id} 
                className={`border-r-[3px] border-black last:border-r-0 p-2 flex flex-col items-center justify-center font-black text-xs sm:text-sm tracking-wide
                  ${day.isToday ? 'bg-[#FF4D4D] text-white' : 'text-black bg-white'}
                `}
              >
                <span>{day.name}</span>
                {day.isToday && <span className="text-[8px] uppercase tracking-widest opacity-80 mt-0.5">Today</span>}
              </div>
            ))}
          </div>

          {/* Baris Waktu (08:00 - 16:00) */}
          {timeSlots.map((time, idx) => (
            <div key={time} className={`grid grid-cols-[70px_repeat(7,1fr)] ${idx !== timeSlots.length - 1 ? 'border-b-[3px] border-black' : ''}`}>
              
              <div className="border-r-[3px] border-black p-2 flex items-center justify-center font-black text-xs text-black bg-gray-50 sticky left-0 z-10 shadow-[2px_0px_0px_0px_rgba(0,0,0,0.1)]">
                {time}
              </div>

              {/* Sel Grid Jadwal per Hari */}
              {days.map((day) => {
                const event = getEvent(day.id, time);
                const isBreakTime = time === "12:00"; 

                return (
                  <div 
                    key={`${day.id}-${time}`} 
                    onClick={() => handleCellClick(day.id, time, event)}
                    className={`border-r-[3px] border-black last:border-r-0 p-1 flex items-center justify-center min-h-[45px] cursor-pointer transition-colors hover:bg-gray-100
                      ${isBreakTime && !event ? 'bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,#f3f4f6_5px,#f3f4f6_10px)]' : ''}
                      ${day.isToday && !event && !isBreakTime ? 'bg-red-50/30' : ''}
                    `}
                  >
                    {event && (
                      <div 
                        className={`w-full h-full flex flex-col items-center justify-center px-1 py-1 border-[2px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-[1px] transition-transform ${event.color}`}
                        title={`${event.course} (${event.type})`}
                      >
                        <span className="font-black text-[9px] sm:text-[10px] text-black uppercase text-center leading-tight line-clamp-2">
                          {event.course}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* LEGEND (Keterangan Warna) */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-6 mt-4 sm:mt-5 px-1">
        {[
          { label: "MAJOR COURSE", color: "bg-[#FFC107]" },
          { label: "ELECTIVE", color: "bg-[#B3D4FF]" },
          { label: "LAB / PRACTICUM", color: "bg-[#5EEAD4]" },
          { label: "SEMINAR", color: "bg-[#FFA6D6]" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 sm:w-4 sm:h-4 border-[2px] border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ${item.color}`}></div>
            <span className="font-black text-[9px] sm:text-xs text-black uppercase tracking-wide">{item.label}</span>
          </div>
        ))}
      </div>

      {/* RENDER MODAL */}
      {modalState.isOpen && (
        <ScheduleModal 
          defaultDay={modalState.dayId}
          defaultTime={modalState.time}
          initialData={modalState.initialData}
          onClose={() => setModalState({ ...modalState, isOpen: false })}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
        />
      )}

    </div>
  );
};

export default PeakHoursSchedule;