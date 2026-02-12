pragma circom 2.1.9;

include "circomlib/circuits/comparators.circom";

template DateIsLessSeconds() {
  signal input firstYear;
  signal input secondYear;

  signal input firstMonth;
  signal input secondMonth;

  signal input firstDay;
  signal input secondDay;

  signal input firstHour;
  signal input secondHour;

  signal input firstMinute;
  signal input secondMinute;

  signal input firstSecond;
  signal input secondSecond;

  signal isYearLess <== LessThan(12)([firstYear, secondYear]);
  signal isMonthLess <== LessThan(8)([firstMonth, secondMonth]);
  signal isDayLess <== LessThan(8)([firstDay, secondDay]);
  signal isHourLess <== LessThan(8)([firstHour, secondHour]);
  signal isMinuteLess <== LessThan(8)([firstMinute, secondMinute]);
  signal isSecondLess <== LessThan(8)([firstSecond, secondSecond]);

  // ----

  signal isYearEqual <== IsEqual()([firstYear, secondYear]);
  signal isMonthEqual <== IsEqual()([firstMonth, secondMonth]);
  signal isDayEqual <== IsEqual()([firstDay, secondDay]);
  signal isHourEqual <== IsEqual()([firstHour, secondHour]);
  signal isMinuteEqual <== IsEqual()([firstMinute, secondMinute]);

  // ----

  signal isYearEqualAndMonthLess <== isYearEqual * isMonthLess;

  signal isYearAndMonthEqual <== isYearEqual * isMonthEqual;
  signal isYearAndMonthEqualAndDayLess <== isYearAndMonthEqual * isDayLess;

  signal isYearAndMonthAndDayEqual <== isYearAndMonthEqual * isDayEqual;
  signal isYearAndMonthAndDayEqualAndHourLess <== isYearAndMonthAndDayEqual * isHourLess;

  signal isYearAndMonthAndDayAndHourEqual <== isYearAndMonthAndDayEqual * isHourEqual;
  signal isYearAndMonthAndDayAndHourEqualAndMinuteLess <== isYearAndMonthAndDayAndHourEqual * isMinuteLess;

  signal isYearAndMonthAndDayAndHourAndMinuteEqual <== isYearAndMonthAndDayAndHourEqual * isMinuteEqual;
  signal isYearAndMonthAndDayAndHourAndMinuteEqualAndSecondLess <== isYearAndMonthAndDayAndHourAndMinuteEqual * isSecondLess;

  signal output out <== isYearLess + isYearEqualAndMonthLess + isYearAndMonthEqualAndDayLess + isYearAndMonthAndDayEqualAndHourLess + isYearAndMonthAndDayAndHourEqualAndMinuteLess + isYearAndMonthAndDayAndHourAndMinuteEqualAndSecondLess;
}
