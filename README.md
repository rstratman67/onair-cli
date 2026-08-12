# CLI for OnAir Airline Manager

A CLI (Command Line Interface) to display information such as flights and aircraft from [OnAir Company](https://onair.company) an addictive career add-on for flight simulator games such as Microsoft Flight Simulator and X-Plane! 

_Requires an active OnAir Company subscription and API key_.

<img src="./assets/screenshot-flight.png" width="80%">

## Install

Requires NodeJS, installs via NPM.

`npm i -g onair-cli`

Run

`onair-cli --help`

or run without a global install

`npm exec onair-cli --help`

## Setup

For ease of use save your OnAir credentials.

`onair-cli save-creds --api-key=[API_KEY] --world=[WORLD] --companyId=[COMPANY_ID]`

Your OnAir API key and Company ID are found in the bottom left of the settings page in the OnAir client. The world name is 'cumulus', 'stratus', or 'thunder'. Use 'stratus' for Clear Sky server.

If you are a member of a Virtual Airline (VA), you can also add your VA ID. This can be found in the Manage VA options screen.

`onair-cli set-creds --apiKey=[API_KEY] --world=[WORLD] --companyId=[COMPANY_ID] --vaId=[VIRTUAL_AIRLINE_ID]`

## Commands

### Aircraft

Show details on an aircraft, including it's recent flights.

`onair-cli aircraft <aircraftId>`

'aircraftId' is a 32 character UUID available from the aircraft details page in the OnAir client.

### Airport

Get information about an airport by passing in it's 4 character ICAO code.

`onair-cli airport <ICAO> [options]`

Optionally show airport parking spot information with `--parking-spots`

### Company

Get summary information on your company. **Note:** You must specify or have previously stored a _companyId_ to be able to run Company commands.

`onair-cli company`

### Company Notifications

Display your company's notifications.

`onair-cli company notifications`

This supports pagination showing 20 notifications per page by default.

`onair-cli company notifications --page=2`

Optionally choose how many notifications to display.

`onair-cli company notifications --limit=50`

Optionally fetch multiple pages when you need more than one request.

`onair-cli company notifications --limit=50 --pages=3`

Optionally fetch notifications from now back to a start date.

`onair-cli company notifications --start-date=2026-05-31`

`onair-cli company notifications --start-date=31/05/2026`

Use `--pages` with `--start-date` to cap how many API pages are fetched.

`onair-cli company notifications --start-date=2026-05-31 --limit=50 --pages=5`

Optionally add an end date to fetch a date range.

`onair-cli company notifications --start-date=2026-05-01 --end-date=2026-05-31`

### Company Fleet

List details of your company's fleet of aircraft.

`onair-cli company fleet`

Fleet results omit aircraft IDs and are sorted by aircraft type, then identifier, by default. Filter by aircraft type or airport.

`onair-cli company fleet --aircraft-type=airbus`

`onair-cli company fleet --airport-icao=KJFK`

`onair-cli company fleet --aircraft-type=airbus --airport-icao=KJFK`

Show engine hours and condition, maintenance information, and the aircraft ID. Aircraft ID is the final column.

`onair-cli company fleet --detail`

Show airframe hours, airframe condition, and hours before the next 100-hour inspection.

`onair-cli company fleet --maintenance`

Show only aircraft that require maintenance now or soon. This automatically includes the maintenance columns.

`onair-cli company fleet --require-maintenance`

Show only aircraft currently in flight. In-flight aircraft display `InFlight` as their airport location, with speed and altitude columns.

`onair-cli company fleet --InFlight`

The lowercase forms `--in-flight` and `--inflight` are also supported. `--maintenence` and `--require-maintenence` are accepted as compatibility aliases.

### Company Flights

List your company's aircraft flights.

`onair-cli company flights`

This supports pagination showing 20 flights per page, i.e.

`onair-cli company flights -p=2`

### Company FBOs

List your company FBOs, including fuel, fuel selling status and tied down/hanger space.

`onair-cli company fbos`

Display FBO jobs grouped under your company FBOs.

`onair-cli company fbos --fbojobs`

Optionally filter FBOs by airport ICAO.

`onair-cli company fbos --fbojobs --airport-icao=KILM`

Optionally list only FBOs with less than 50% fuel available. Add `--100LL` or `--Jet` to check a specific fuel type.

`onair-cli company fbos --need-fuel`

`onair-cli company fbos --need-fuel --100LL`

`onair-cli company fbos --need-fuel --Jet`

Optionally filter FBO jobs by destination airport ICAO.

`onair-cli company fbos --fbojobs --airport-icao=KILM --destination-icao=KERI`

List only pending, untaken FBO jobs. Filter by a leg's departure airport, arrival airport, or both.

`onair-cli company fbos --fbojobs --pending-only`

`onair-cli company fbos --fbojobs --pending-only --departure-icao=KILM --arrival-icao=KERI`

`--pending`, `--departure`, and `--arrival` are shorter aliases. The existing `--destination-icao` option remains available as an arrival filter.

List available destination ICAOs for FBO jobs at an airport.

`onair-cli company fbos --fbojobs --airport-icao=KILM --list-destinations`

### Company Jobs

List your company's pending jobs

`onair-cli company jobs`

### Company Cashflow

Display your company's cashflow, including current cash, last report amount and cashflow entries.

`onair-cli company cashflow`

`onair-cli company cash-flow`

Optionally show only payment entries, filtered by payment text such as Cargo or PAX.

`onair-cli company cashflow --payment=Cargo`

`onair-cli company cashflow --payment=PAX`

Optionally show readable account names where available.

`onair-cli company cashflow --readable-account-ids`

`onair-cli company cashflow --payment=Cargo --readable-account-ids`

### Company Work Orders

List your company's work orders.

`onair-cli company work-orders`

Optionally filter by aircraft ICAO.

`onair-cli company work-orders --aircraft-icao=C172`

Optionally filter by the aircraft's human-readable identifier. Matching is case-insensitive.

`onair-cli company work-orders --aircraft-ident=N123AB`

Optionally filter by status. Available values are `inactive`, `pending`, `in-progress`, `finished`, `failed`, and `waiting`.

`onair-cli company work-orders --work-order-status=pending`

Status filtering can be combined with the aircraft filters.

`onair-cli company work-orders --aircraft-ident=N123AB --work-order-status=in-progress`

Optionally show assigned crew with readable names.

`onair-cli company work-orders --show-crew`

Optionally show the work order ID.

`onair-cli company work-orders --work-order-id`

Display detailed information for one work order using the ID shown by `--work-order-id`.

`onair-cli company work-orders --work-order-detail=WORK_ORDER_ID`

### Company Trading Goods

List your company's trading goods.

`onair-cli company trading-goods`

`onair-cli company trading_goods`

Optionally filter by merchandise type name.

`onair-cli company trading_goods --merchandiseType=Water`

Optionally filter by airport ICAO.

`onair-cli company trading_goods --trading-airport-icao=KJFK`

Optionally hide raw IDs or swap them to readable values.

`onair-cli company trading_goods --hide-ids`

`onair-cli company trading_goods --readable-ids`

Optionally show a one-line summary per trading good.

`onair-cli company trading_goods --summary`

### Flight

Display flight data and airport info for a completed flight. In-progress or aborted flights are not supported.

`onair-cli flight <flightID>`

'flightID' is a 32 character UUID that is displayed on the completed flights screen of the OnAir Company client.

Optionally show aircraft information too with `--show-aircraft`

### Flights

Lists flights for an aircraft.

`onair-cli flights <aircraftId>`

This supports pagination showing 20 flights per page, i.e.

`onair-cli flights <aircraftId> -p=2`

'aircraftId' is a 32 character UUID available from the aircraft details page in the OnAir client.

### (VA) Virtual Airline
Get summary information for a given virtual airline. **Note:** You must specify or have previously stored a vaId to be able to run VA commands.

`onair-cli va`

### (VA) Virtual Airline Members
Shows the members of a given VA and their associated details. The role name and color will match with whatever OnAir reports.

`onair-cli va members`

### Save Credentials

Your OnAir API key and Company ID are found in the bottom left of the settings page in the OnAir client. The world name is 'cumulus', 'stratus', or 'thunder'. 

`onair-cli set-creds --apiKey=[API_KEY] --world=[WORLD] --companyId=[COMPANY_ID]`

If you are a member of a Virtual Airline (VA), you can also add your VA ID. This can be found in the Manage VA options screen.

`onair-cli set-creds --apiKey=[API_KEY] --world=[WORLD] --companyId=[COMPANY_ID] --vaId=[VIRTUAL_AIRLINE_ID]`

These credentials are stored in the system home directory `~./.onair-credentials`. Alternatively they can be passed into each command if you don't want them saved locally.

### Delete Credentials

`onair-cli delete-creds`

Remove your locally stored OnAir credentials.

## Docker deployment

This repository now includes a Dockerized web dashboard that uses the existing OnAir CLI API layer.

1. Copy `.env.example` to `.env` and set your credentials:

```bash
cp .env.example .env
```

2. Set your values in `.env`:

```text
ONAIR_API_KEY=your_api_key_here
ONAIR_WORLD=stratus
COMPANY_ID=your_company_id_here
ONAIR_VA_ID=your_va_id_here
```

3. Build and run with Docker Compose:

```bash
docker compose up --build
```

4. Open the dashboard in your browser:

```text
http://localhost:8081
```

### Available pages

- `/company` — company summary
- `/company/fbos` — FBO list
- `/company/jobs` — pending jobs
- `/company/work-orders` — work orders
- `/company/flights` — flights
- `/company/trading-goods` — trading goods (if supported by `onair-api`)

### Notes

- The server reads credentials from environment variables: `ONAIR_API_KEY`, `ONAIR_WORLD`, and `COMPANY_ID`.
- `ONAIR_VA_ID` is optional and only needed if using VA-specific data.

This application is not affiliated with or endorsed by OnAir Company. OnAir Airline Manager &copy; OnAir Company.

## License
[MIT](https://choosealicense.com/licenses/mit/)
