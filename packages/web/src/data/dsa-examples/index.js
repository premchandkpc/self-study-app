import two_pointer_sum from './examples/two-pointer-sum.js';
import sliding_window_max from './examples/sliding-window-max.js';
import binary_search from './examples/binary-search.js';
import palindrome_check from './examples/palindrome-check.js';
import merge_sorted_lists from './examples/merge-sorted-lists.js';
import remove_duplicates from './examples/remove-duplicates.js';
import contains_duplicate from './examples/contains-duplicate.js';
import max_subarray from './examples/max-subarray.js';
import best_time_buy_sell from './examples/best-time-buy-sell.js';
import rotate_array from './examples/rotate-array.js';
import reverse_string from './examples/reverse-string.js';
import valid_palindrome from './examples/valid-palindrome.js';
import longest_substring from './examples/longest-substring.js';
import group_anagrams from './examples/group-anagrams.js';
import merge_intervals from './examples/merge-intervals.js';
import product_array from './examples/product-array.js';
import first_missing_positive from './examples/first-missing-positive.js';
import interval_scheduling from './examples/interval-scheduling.js';
import lcs from './examples/lcs.js';
import coin_change from './examples/coin-change.js';
import word_break from './examples/word-break.js';
import house_robber from './examples/house-robber.js';
import climb_stairs from './examples/climb-stairs.js';
import fib_sequence from './examples/fib-sequence.js';
import min_window_substring from './examples/min-window-substring.js';
import three_sum from './examples/three-sum.js';
import trapping_rain_water from './examples/trapping-rain-water.js';
import valid_parentheses from './examples/valid-parentheses.js';
import daily_temperatures from './examples/daily-temperatures.js';
import min_stack from './examples/min-stack.js';
import number_of_islands from './examples/number-of-islands.js';
import course_schedule from './examples/course-schedule.js';
import pacific_atlantic from './examples/pacific-atlantic.js';
import surrounded_regions from './examples/surrounded-regions.js';
import clone_graph from './examples/clone-graph.js';
import word_ladder from './examples/word-ladder.js';
import alien_dictionary from './examples/alien-dictionary.js';
import meeting_rooms from './examples/meeting-rooms.js';
import meeting_rooms_2 from './examples/meeting-rooms-2.js';
import next_permutation from './examples/next-permutation.js';
import palindrome_partitions from './examples/palindrome-partitions.js';
import letter_combinations from './examples/letter-combinations.js';
import subsets from './examples/subsets.js';
import combination_sum from './examples/combination-sum.js';
import permutations from './examples/permutations.js';
import generate_parentheses from './examples/generate-parentheses.js';
import word_search from './examples/word-search.js';

export const EXAMPLES = {
  'two-pointer-sum': two_pointer_sum,
  'sliding-window-max': sliding_window_max,
  'binary-search': binary_search,
  'palindrome-check': palindrome_check,
  'merge-sorted-lists': merge_sorted_lists,
  'remove-duplicates': remove_duplicates,
  'contains-duplicate': contains_duplicate,
  'max-subarray': max_subarray,
  'best-time-buy-sell': best_time_buy_sell,
  'rotate-array': rotate_array,
  'reverse-string': reverse_string,
  'valid-palindrome': valid_palindrome,
  'longest-substring': longest_substring,
  'group-anagrams': group_anagrams,
  'merge-intervals': merge_intervals,
  'product-array': product_array,
  'first-missing-positive': first_missing_positive,
  'interval-scheduling': interval_scheduling,
  'lcs': lcs,
  'coin-change': coin_change,
  'word-break': word_break,
  'house-robber': house_robber,
  'climb-stairs': climb_stairs,
  'fib-sequence': fib_sequence,
  'min-window-substring': min_window_substring,
  'three-sum': three_sum,
  'trapping-rain-water': trapping_rain_water,
  'valid-parentheses': valid_parentheses,
  'daily-temperatures': daily_temperatures,
  'min-stack': min_stack,
  'number-of-islands': number_of_islands,
  'course-schedule': course_schedule,
  'pacific-atlantic': pacific_atlantic,
  'surrounded-regions': surrounded_regions,
  'clone-graph': clone_graph,
  'word-ladder': word_ladder,
  'alien-dictionary': alien_dictionary,
  'meeting-rooms': meeting_rooms,
  'meeting-rooms-2': meeting_rooms_2,
  'next-permutation': next_permutation,
  'palindrome-partitions': palindrome_partitions,
  'letter-combinations': letter_combinations,
  'subsets': subsets,
  'combination-sum': combination_sum,
  'permutations': permutations,
  'generate-parentheses': generate_parentheses,
  'word-search': word_search
};

export function getExamplesByTopic(topic) {
  return Object.entries(EXAMPLES)
    .filter(([, ex]) => ex.topic === topic)
    .map(([id, ex]) => ({ id, ...ex }));
}

export function getExample(id) {
  return EXAMPLES[id] ? { id, ...EXAMPLES[id] } : null;
}

