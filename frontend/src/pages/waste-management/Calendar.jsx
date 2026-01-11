import { useState } from 'react';
import { ChevronLeft, ChevronRight } from "lucide-react";
import SimpleBar from 'simplebar-react';

const CustomCalendar = ({ wastes }) => {
    
    // State to store the current selected month
    const [currentDate, setCurrentDate] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    });

    // Month and day labels
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

     // Get all days for the current month, including padding for the first week
    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();

        let firstDayOfWeek = firstDay.getDay();
        firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

        const days = [];
        for (let i = 0; i < firstDayOfWeek; i++) {
            days.push(null);
        }
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(day);
        }
        return days;
    };

  // Get waste collection event for a specific day
    const getEventForDate = (day) => {
        if (!day) return null;

        const dateToCheck = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const formattedDate = dateToCheck.toISOString().split('T')[0];

        return wastes.find(event => {
            const eventDate = new Date(event.collected_date).toISOString().split('T')[0];
            return eventDate === formattedDate;
        });
    };

     // Navigate to previous or next month
    const navigateMonth = (direction) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(currentDate.getMonth() + direction);
        setCurrentDate(newDate);
    };

    // Check if a given day is today
    const isToday = (day) => {
        if (!day) return false;
        const today = new Date();
        const dateToCheck = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        return dateToCheck.toDateString() === today.toDateString();
    };

    // Generate calendar weeks from days array
    const days = getDaysInMonth(currentDate);
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
        weeks.push(days.slice(i, i + 7));
    }

    return (
        <>
            <div className="p-2 p-md-3">
                <div className="calendar-header mb-4">
                    <div className="d-flex align-items-center">
                        <button className="nav-button" onClick={() => navigateMonth(-1)}>
                            <ChevronLeft size={20} />
                        </button>
                        <h2 className="month-title mx-3">
                            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                        </h2>
                        <button className="nav-button" onClick={() => navigateMonth(1)}>
                            <ChevronRight size={20} />
                        </button>
                    </div>
                    <button className="today-btn" onClick={() => setCurrentDate(new Date())}>
                        Today
                    </button>
                </div>
                <div className="calendar-container">
                    <div className="calendar-wrapper">
                        <SimpleBar>
                            <table className="calendar-grid">
                                <thead>
                                    <tr>
                                        {dayNames.map(day => (
                                            <th key={day} className="day-header">{day}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {weeks.map((week, weekIndex) => (
                                        <tr key={weekIndex}>
                                            {week.map((day, dayIndex) => {
                                                const event = getEventForDate(day);
                                                return (
                                                    <td key={dayIndex} className={`calendar-cell ${!day ? 'empty-cell' : ''}`}>
                                                        {day && (
                                                            <>
                                                                <div className={`day-number ${isToday(day) ? 'today' : ''}`}>
                                                                    {day}
                                                                </div>
                                                                {event && (
                                                                    <div className="event-card">
                                                                        <div className="event-title fs-16 mb-1">{event.zone?.name || 'No Zone'}</div>
                                                                        <div className="event-subtitle fs-14 mb-1">{event.waste_type?.name || 'No Type'}</div>
                                                                        <div className="event-code fs-14">{event.quantity} KG</div>
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </SimpleBar>
                    </div>
                </div>
            </div>
        </>
    );
};

export default CustomCalendar;