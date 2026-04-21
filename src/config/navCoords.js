/**
 * @file navCoords.js
 * @description Representative map coordinates for every static nav node.
 *
 * Used by MiniMap to centre the thumbnail on a meaningful location rather
 * than a computed centroid. Each entry uses the largest or most recognisable
 * city/town for that node. Keys match navConfig.js values exactly.
 *
 * Coverage: UK root, 4 countries, all regions, all counties.
 * Constituency and ward use data-computed centroids (see Locations.jsx).
 */

export const NAV_COORDS = {

  // ── UK root ──────────────────────────────────────────────────────────────
  'United Kingdom':              { lat: 52.4862, lng: -1.8904 },  // Birmingham — geographic centre

  // ── Countries ─────────────────────────────────────────────────────────────
  'England':                     { lat: 51.5074, lng: -0.1278  },  // London
  'Scotland':                    { lat: 55.9533, lng: -3.1883  },  // Edinburgh
  'Wales':                       { lat: 51.4816, lng: -3.1791  },  // Cardiff
  'Northern Ireland':            { lat: 54.5973, lng: -5.9301  },  // Belfast

  // ── English regions ───────────────────────────────────────────────────────
  'North East':                  { lat: 54.9783, lng: -1.6178  },  // Newcastle
  'North West':                  { lat: 53.4808, lng: -2.2426  },  // Manchester
  'Yorkshire and The Humber':    { lat: 53.7997, lng: -1.5492  },  // Leeds
  'East Midlands':               { lat: 52.9548, lng: -1.1581  },  // Nottingham
  'West Midlands':               { lat: 52.4862, lng: -1.8904  },  // Birmingham
  'East of England':             { lat: 52.2053, lng:  0.1218  },  // Cambridge
  'London':                      { lat: 51.5074, lng: -0.1278  },  // London
  'South East':                  { lat: 50.9097, lng: -1.4044  },  // Southampton
  'South West':                  { lat: 51.4545, lng: -2.5879  },  // Bristol

  // ── Scottish regions ──────────────────────────────────────────────────────
  'Highlands and Islands':       { lat: 57.4778, lng: -4.2247  },  // Inverness
  'North East Scotland':         { lat: 57.1497, lng: -2.0943  },  // Aberdeen
  'Central Belt':                { lat: 55.8642, lng: -4.2518  },  // Glasgow
  'South Scotland':              { lat: 55.0708, lng: -3.6057  },  // Dumfries

  // ── Welsh regions ─────────────────────────────────────────────────────────
  'North Wales':                 { lat: 53.2280, lng: -4.1293  },  // Bangor
  'Mid Wales':                   { lat: 52.4153, lng: -4.0829  },  // Aberystwyth
  'South Wales':                 { lat: 51.4816, lng: -3.1791  },  // Cardiff

  // ── English counties ──────────────────────────────────────────────────────
  // North East
  'Durham':                      { lat: 54.7761, lng: -1.5756  },  // Durham
  'Northumberland':              { lat: 55.1672, lng: -1.6908  },  // Morpeth
  'Tyne and Wear':               { lat: 54.9783, lng: -1.6178  },  // Newcastle

  // North West
  'Cheshire':                    { lat: 53.1905, lng: -2.8910  },  // Chester
  'Cumberland':                  { lat: 54.8951, lng: -2.9382  },  // Carlisle
  'Greater Manchester':          { lat: 53.4808, lng: -2.2426  },  // Manchester
  'Lancashire':                  { lat: 53.7632, lng: -2.7031  },  // Preston
  'Merseyside':                  { lat: 53.4084, lng: -2.9916  },  // Liverpool
  'Westmorland':                 { lat: 54.3208, lng: -2.7440  },  // Kendal

  // Yorkshire and The Humber
  'South Yorkshire':             { lat: 53.3811, lng: -1.4701  },  // Sheffield
  'West Yorkshire':              { lat: 53.7997, lng: -1.5492  },  // Leeds
  'Yorkshire':                   { lat: 53.9600, lng: -1.0873  },  // York

  // East Midlands
  'Derbyshire':                  { lat: 52.9225, lng: -1.4746  },  // Derby
  'Huntingdonshire':             { lat: 52.3310, lng: -0.1872  },  // Huntingdon
  'Leicestershire':              { lat: 52.6369, lng: -1.1398  },  // Leicester
  'Lincolnshire':                { lat: 53.2307, lng: -0.5406  },  // Lincoln
  'Northamptonshire':            { lat: 52.2405, lng: -0.9027  },  // Northampton
  'Nottinghamshire':             { lat: 52.9548, lng: -1.1581  },  // Nottingham
  'Rutland':                     { lat: 52.6720, lng: -0.7316  },  // Oakham

  // West Midlands
  'Herefordshire':               { lat: 52.0566, lng: -2.7160  },  // Hereford
  'Shropshire':                  { lat: 52.7078, lng: -2.7540  },  // Shrewsbury
  'Staffordshire':               { lat: 53.0027, lng: -2.1794  },  // Stoke-on-Trent
  'Warwickshire':                { lat: 52.2816, lng: -1.5864  },  // Warwick
  'West Midlands':               { lat: 52.4862, lng: -1.8904  },  // Birmingham
  'Worcestershire':              { lat: 52.1920, lng: -2.2200  },  // Worcester

  // East of England
  'Bedfordshire':                { lat: 52.1360, lng: -0.4640  },  // Bedford
  'Cambridgeshire':              { lat: 52.2053, lng:  0.1218  },  // Cambridge
  'Essex':                       { lat: 51.7356, lng:  0.4685  },  // Chelmsford
  'Hertfordshire':               { lat: 51.7526, lng: -0.3360  },  // St Albans
  'Norfolk':                     { lat: 52.6309, lng:  1.2974  },  // Norwich
  'Suffolk':                     { lat: 52.0567, lng:  1.1482  },  // Ipswich

  // London
  'Inner London':                { lat: 51.5074, lng: -0.1278  },  // London
  'Outer London':                { lat: 51.4700, lng: -0.1200  },  // London (outer)

  // South East
  'Berkshire':                   { lat: 51.4543, lng: -0.9781  },  // Reading
  'Buckinghamshire':             { lat: 52.0406, lng: -0.7594  },  // Milton Keynes
  'Hampshire':                   { lat: 50.9097, lng: -1.4044  },  // Southampton
  'Kent':                        { lat: 51.2802, lng:  1.0789  },  // Canterbury
  'Oxfordshire':                 { lat: 51.7520, lng: -1.2577  },  // Oxford
  'Surrey':                      { lat: 51.2365, lng: -0.5703  },  // Guildford
  'Sussex':                      { lat: 50.8225, lng: -0.1372  },  // Brighton

  // South West
  'Cornwall':                    { lat: 50.2632, lng: -5.0510  },  // Truro
  'Devon':                       { lat: 50.7184, lng: -3.5339  },  // Exeter
  'Dorset':                      { lat: 50.7192, lng: -1.8808  },  // Bournemouth
  'Gloucestershire':             { lat: 51.8642, lng: -2.2384  },  // Gloucester
  'Somerset':                    { lat: 51.3758, lng: -2.3599  },  // Bath
  'Wiltshire':                   { lat: 51.0693, lng: -1.7942  },  // Salisbury

  // ── Scottish counties ─────────────────────────────────────────────────────
  'Caithness':                   { lat: 58.4399, lng: -3.0999  },  // Wick
  'Sutherland':                  { lat: 57.9716, lng: -3.9825  },  // Golspie
  'Ross-shire':                  { lat: 57.4778, lng: -4.2247  },  // Inverness
  'Cromartyshire':               { lat: 57.6793, lng: -4.0340  },  // Cromarty
  'Inverness-shire':             { lat: 57.4778, lng: -4.2247  },  // Inverness
  'Nairnshire':                  { lat: 57.5855, lng: -3.8799  },  // Nairn
  'Argyllshire':                 { lat: 56.4143, lng: -5.4727  },  // Oban
  'Buteshire':                   { lat: 55.8372, lng: -5.0577  },  // Rothesay
  'Orkney':                      { lat: 58.9814, lng: -2.9604  },  // Kirkwall
  'Shetland':                    { lat: 60.1550, lng: -1.1490  },  // Lerwick
  'Aberdeenshire':               { lat: 57.1497, lng: -2.0943  },  // Aberdeen
  'Banffshire':                  { lat: 57.6637, lng: -2.5207  },  // Banff
  'Kincardineshire':             { lat: 56.9638, lng: -2.2107  },  // Stonehaven
  'Morayshire':                  { lat: 57.6474, lng: -3.3151  },  // Elgin
  'Angus':                       { lat: 56.4620, lng: -2.9707  },  // Dundee
  'Lanarkshire':                 { lat: 55.8642, lng: -4.2518  },  // Glasgow
  'Renfrewshire':                { lat: 55.8456, lng: -4.4238  },  // Paisley
  'Dunbartonshire':              { lat: 55.9425, lng: -4.5693  },  // Dumbarton
  'Stirlingshire':               { lat: 56.1165, lng: -3.9369  },  // Stirling
  'Clackmannanshire':            { lat: 56.1152, lng: -3.7923  },  // Alloa
  'Kinross-shire':               { lat: 56.2076, lng: -3.4230  },  // Kinross
  'Fife':                        { lat: 56.3398, lng: -2.7967  },  // St Andrews
  'Perthshire':                  { lat: 56.3950, lng: -3.4310  },  // Perth
  'Midlothian':                  { lat: 55.9533, lng: -3.1883  },  // Edinburgh
  'East Lothian':                { lat: 55.9546, lng: -2.7784  },  // Haddington
  'West Lothian':                { lat: 55.9050, lng: -3.5250  },  // Livingston
  'Ayrshire':                    { lat: 55.4588, lng: -4.6295  },  // Ayr
  'Dumfriesshire':               { lat: 55.0708, lng: -3.6057  },  // Dumfries
  'Kirkcudbrightshire':          { lat: 54.8358, lng: -4.0584  },  // Kirkcudbright
  'Wigtownshire':                { lat: 54.9054, lng: -5.0290  },  // Stranraer
  'Berwickshire':                { lat: 55.7708, lng: -2.0064  },  // Berwick-upon-Tweed
  'Roxburghshire':               { lat: 55.4773, lng: -2.5536  },  // Jedburgh
  'Selkirkshire':                { lat: 55.5510, lng: -2.8379  },  // Selkirk
  'Peeblesshire':                { lat: 55.6477, lng: -3.1960  },  // Peebles

  // ── Welsh counties ────────────────────────────────────────────────────────
  'Anglesey':                    { lat: 53.3125, lng: -4.6328  },  // Holyhead
  'Caernarfonshire':             { lat: 53.1393, lng: -4.2720  },  // Caernarfon
  'Denbighshire':                { lat: 53.1745, lng: -3.4224  },  // Denbigh
  'Flintshire':                  { lat: 53.2478, lng: -3.1386  },  // Flint
  'Merionethshire':              { lat: 52.7358, lng: -3.8847  },  // Dolgellau
  'Montgomeryshire':             { lat: 52.6593, lng: -3.1476  },  // Welshpool
  'Radnorshire':                 { lat: 52.2418, lng: -3.3788  },  // Llandrindod Wells
  'Cardiganshire':               { lat: 52.4153, lng: -4.0829  },  // Aberystwyth
  'Brecknockshire':              { lat: 51.9454, lng: -3.3910  },  // Brecon
  'Glamorgan':                   { lat: 51.4816, lng: -3.1791  },  // Cardiff
  'Carmarthenshire':             { lat: 51.8580, lng: -4.3120  },  // Carmarthen
  'Pembrokeshire':               { lat: 51.8010, lng: -4.9720  },  // Haverfordwest
  'Monmouthshire':               { lat: 51.5842, lng: -2.9977  },  // Newport
}
