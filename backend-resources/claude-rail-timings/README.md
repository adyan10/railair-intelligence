# Unified Indian Railways rail-times dataset

One merged dataset built from three sources. Everything here is a **historical snapshot, not a live timetable**.

## Sources

| Source | What it is | Snapshot | Used for |
|---|---|---|---|
| `isl_wise_train_detail_03082015_v1.csv` (your upload) | Stop-by-stop timetable, 69,006 rows, 2,810 trains | 2015-08-03 (from file name) | Trains missing from the 2017 file |
| `itzmeanjan/indian-railway` → `data/Train_details_22122017.csv` | Same layout, 186,124 rows, ~11,100 trains. The repo says it came from data.gov.in | 2017-12-22 (from file name) | Primary timetable |
| IRCTC `List_of_Special_Trains_by_Indian_Railways.pdf` | 228 listing rows (222 distinct train numbers) of special trains: origin, destination, departure/arrival, frequency. **No intermediate stops.** | Undated. Numbering and format look like the 2020 COVID-era special-train programme (my inference, not stated in the PDF) | Special-train records |

Station coordinates, state and zone in `stations.csv` come from the DataMeet railways stations file used earlier in this conversation (2017-era). They are an add-on and not part of your three sources.

## Files

| File | Rows | One row is |
|---|---|---|
| `train_stops.csv` | 193,005 | One stop of one train (the actual rail times) |
| `trains.csv` | 11,679 | One train record: route summary, journey time, flags |
| `stations.csv` | 8,241 | One station code used in the timetables |
| `special_trains_irctc.csv` | 228 | One row of the IRCTC list, cleaned (duplicates kept) |

### `train_stops.csv`
`train_no` (5-digit text), `train_name`, `stop_seq`, `station_code`, `station_name`, `arrival`, `departure` (HH:MM), `distance_km` (from origin), `arrival_day`, `departure_day` (day 1 = origin departure day), `snapshot`, `quality_flag`.

### `trains.csv`
`record_id` (unique key), `train_no`, `train_name`, `origin_*`, `destination_*`, `n_stops`, `first_departure`, `last_arrival`, `total_distance_km`, `journey_days`, `journey_minutes`, `snapshot`, `in_2015`, `in_2017`, `stop_pattern_changed_since_2015`, `n_stops_2015`, `quality_flag`, `record_type` (`timetable` or `special_list_only`), `in_irctc_special_list`, `special_*` columns, `train_no_reused`.

### `stations.csv`
`station_code`, `station_name` (most common spelling in the timetables), `n_trains`, `latitude`, `longitude`, `state`, `zone`, `in_datameet`, `coords_plausible`.

## How the merge works

- **Train numbers** are zero-padded to 5 characters. The 2017 file stores 107 where the 2015 file stores 00107.
- **One timetable per train.** Both snapshots cover 2,465 trains. For those the 2017 version is used. 345 trains exist only in 2015, so their 2015 rows are kept. `snapshot` says which one each row came from. 11,112 trains come from 2017.
- **Origin arrival and terminus departure are blank.** The 2015 file puts 00:00:00 there, and the 2017 file often repeats the other time. Both were blanked for consistency.
- **Day counters are derived by me**, not in the sources. They increase whenever a time is earlier than the previous time. Day 1 is the origin departure day. They are blank for flagged trains.
- **`journey_minutes`** = last arrival minus first departure, using those day counters.
- **IRCTC list.** Times were parsed from the PDF text, which had day numbers glued to times (for example `20:152` = 20:15, day 2). Days were normalised to MON–SUN (typos `TYE` and `TUS` read as TUE). Station names carrying stray times, such as `Una Himachal (2210)`, were cleaned.
- **Owning railway** is printed on only one train of each up/down pair. It was copied to its partner (`owning_rly_basis` = `pair`). The AC-special table has no such column.
- **Special-train station codes** (`from_code`, `to_code`) are matched by name, using a hand-written alias list for common names. They are blank where I could not match them safely.

## Problems found and what was done

1. **2017 file: 5 stops were split across two lines** (train numbers 06919, 06920, 56905, 56906, 57641 at Kalgurki Halt). They were repaired by merging the fragment back.
2. **2015 file: sequence numbers repeat for 10 trains** (for example 01156, 05010), where two itineraries are interleaved. Their stops are ordered by distance and marked `seq_conflict_2015`. Treat these trains as unreliable.
3. **Train numbers are reused.** Five numbers (01301, 01302, 02779, 02833, 02834) appear in both a timetable and the IRCTC list as **different services**. They are kept as separate records (`train_no_reused` = True) and not merged.
4. **The two timetables differ a lot.** Of the 2,465 trains in both, 1,668 have a different list of stops in 2017. `stop_pattern_changed_since_2015` and `n_stops_2015` show this. Do not treat 2015 and 2017 as the same schedule.
5. **Train names are truncated** in the source data (often 12 characters, for example `BPL - NDLS S`).

## Limits

- These are 2015 and 2017 schedules plus an undated special list, so they will not match today's timetable.
- The IRCTC records have no stops or distances, so `n_stops` and `total_distance_km` are empty for them.
- RRTS (Namo Bharat) and metro stations are not in any of the three sources.
- `station_name` spellings are abbreviated and inconsistent in the sources. Join on `station_code`.
- `Lucknow Jn` (LKO or LJN?), `Prayagraj` (the 2018+ code PRYJ is not in these older timetables) and `Jodhpu/Bikaner` were left without codes.
