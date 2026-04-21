/**
 * @file navConfig.js
 * @description Curated static navigation tree for UKCP location walker.
 *
 * Structure: country -> regions -> counties.
 * County values are exact ctyhistnm field values from newplace.csv.
 * Two overrides applied at data-build time:
 *   - Greater London rows: ctyhistnm = cty23nm (Inner London / Outer London)
 *   - Metro LAD rows: ctyhistnm = metro county name
 *
 * This config is the authoritative list of navigable nodes at each level.
 * Constituency and ward children are queried from data rows at runtime.
 *
 * Scotland/Wales: curated region → county groupings, populated from ctyhistnm values.
 *   Constituency/ward data deferred — county level is the current nav leaf.
 * NI: flat structure (no region level), counties deferred.
 *
 * @module config/navConfig
 */
/** Canonical display-name list for the country selector (panel1). */
export const COUNTRIES = ['England', 'Scotland', 'Wales', 'Northern Ireland']

export const NAV_CONFIG = {
  england: {
    regions: {
      'North East': {
        counties: ['Durham', 'Northumberland', 'Tyne and Wear'],
      },
      'North West': {
        counties: ['Cheshire', 'Cumberland', 'Greater Manchester', 'Lancashire', 'Merseyside', 'Westmorland'],
      },
      'Yorkshire and The Humber': {
        counties: ['South Yorkshire', 'West Yorkshire', 'Yorkshire'],
      },
      'East Midlands': {
        counties: ['Derbyshire', 'Huntingdonshire', 'Leicestershire', 'Lincolnshire', 'Northamptonshire', 'Nottinghamshire', 'Rutland'],
      },
      'West Midlands': {
        counties: ['Herefordshire', 'Shropshire', 'Staffordshire', 'Warwickshire', 'West Midlands', 'Worcestershire'],
      },
      'East of England': {
        counties: ['Bedfordshire', 'Cambridgeshire', 'Essex', 'Hertfordshire', 'Norfolk', 'Suffolk'],
      },
      'London': {
        counties: ['Inner London', 'Outer London'],
      },
      'South East': {
        counties: ['Berkshire', 'Buckinghamshire', 'Hampshire', 'Kent', 'Oxfordshire', 'Surrey', 'Sussex'],
      },
      'South West': {
        counties: ['Cornwall', 'Devon', 'Dorset', 'Gloucestershire', 'Somerset', 'Wiltshire'],
      },
    },
  },
  // Scotland: curated regional groupings. County values = ctyhistnm from newplace.csv.
  scotland: {
    regions: {
      'Highlands and Islands': {
        counties: ['Caithness', 'Sutherland', 'Ross-shire', 'Cromartyshire', 'Inverness-shire', 'Nairnshire', 'Argyllshire', 'Buteshire', 'Orkney', 'Shetland'],
      },
      'North East Scotland': {
        counties: ['Aberdeenshire', 'Banffshire', 'Kincardineshire', 'Morayshire', 'Angus'],
      },
      'Central Belt': {
        counties: ['Lanarkshire', 'Renfrewshire', 'Dunbartonshire', 'Stirlingshire', 'Clackmannanshire', 'Kinross-shire', 'Fife', 'Perthshire', 'Midlothian', 'East Lothian', 'West Lothian'],
      },
      'South Scotland': {
        counties: ['Ayrshire', 'Dumfriesshire', 'Kirkcudbrightshire', 'Wigtownshire', 'Berwickshire', 'Roxburghshire', 'Selkirkshire', 'Peeblesshire'],
      },
    },
  },
  // Wales: curated regional groupings. County values = ctyhistnm from newplace.csv.
  wales: {
    regions: {
      'North Wales': {
        counties: ['Anglesey', 'Caernarfonshire', 'Denbighshire', 'Flintshire', 'Merionethshire'],
      },
      'Mid Wales': {
        counties: ['Montgomeryshire', 'Radnorshire', 'Cardiganshire', 'Brecknockshire'],
      },
      'South Wales': {
        counties: ['Glamorgan', 'Carmarthenshire', 'Pembrokeshire', 'Monmouthshire'],
      },
    },
  },
  // Northern Ireland: flat structure (no region level). Sprint 12.
  ni: {
    counties: [],
  },
}
