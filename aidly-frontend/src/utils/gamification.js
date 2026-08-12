import firstLesson from '../assets/badges/first-lesson.svg';
import quizMaster from '../assets/badges/quiz-master.svg';
import roadReady from '../assets/badges/road-ready.svg';
import fiveWeekStreak from '../assets/badges/five-week-streak.svg';
import tenWeekStreak from '../assets/badges/ten-week-streak.svg';
import centuryClub from '../assets/badges/century-club.svg';
import highAchiever from '../assets/badges/high-achiever.svg';

export const BADGE_ICONS = {
  FIRST_LESSON: firstLesson,
  QUIZ_MASTER: quizMaster,
  ROAD_READY: roadReady,
  FIVE_WEEK_STREAK: fiveWeekStreak,
  TEN_WEEK_STREAK: tenWeekStreak,
  CENTURY_CLUB: centuryClub,
  HIGH_ACHIEVER: highAchiever,
};

// Mirrors the backend's fixed v1 badge catalog (BadgeType.java) so the UI can
// show the full set — earned and not-yet-earned — rather than only what the
// student has already unlocked.
export const BADGE_CATALOG = [
  { type: 'FIRST_LESSON', displayName: 'First Lesson', description: 'Completed your first practical lesson' },
  { type: 'QUIZ_MASTER', displayName: 'Quiz Master', description: 'Passed your first quiz' },
  { type: 'ROAD_READY', displayName: 'Road Ready', description: 'Passed your first driving assessment' },
  { type: 'FIVE_WEEK_STREAK', displayName: '5-Week Streak', description: 'Completed a lesson 5 weeks in a row' },
  { type: 'TEN_WEEK_STREAK', displayName: '10-Week Streak', description: 'Completed a lesson 10 weeks in a row' },
  { type: 'CENTURY_CLUB', displayName: 'Century Club', description: 'Earned 100 total points' },
  { type: 'HIGH_ACHIEVER', displayName: 'High Achiever', description: 'Earned 500 total points' },
];
