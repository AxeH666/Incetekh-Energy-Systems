// Manufacturer/supplier catalogue references checked 2026-09-30.
// Listing is an enquiry option, not a claim of authorised dealership or stock.
export const productGroups = [
  {
    id: 'panels',
    title: 'Solar panels',
    number: '01',
    description:
      'The surface that does the work. Choose modules around usable roof area, electrical design and the eligibility requirements of your project.',
    guidance:
      'Compare the exact module datasheet, product warranty and power-output warranty separately. For a subsidised system, confirm domestic-content and applicable approved-model requirements before ordering.',
    products: [
      {
        name: 'Waaree',
        type: 'Solar PV modules',
        detail:
          'Mono PERC and N-type TOPCon module options. Ask us to match a module to your rooftop and subsidy requirements.',
        source: 'https://shop.waaree.com/',
      },
      {
        name: 'Tata Power Solar',
        type: 'Solar PV modules',
        detail:
          'Solar modules for rooftop systems. Confirm the exact model, rating and warranty in your proposal.',
        source: 'https://www.tatapower.com/renewables/solar-energy',
      },
      {
        name: 'Adani Solar',
        type: 'Solar PV modules',
        detail:
          'Mono PERC and TOPCon module ranges. Selection depends on your system design and available roof space.',
        source: 'https://www.adanisolar.com/Downloads',
      },
    ],
  },
  {
    id: 'inverters',
    title: 'Solar inverters',
    number: '02',
    description:
      'From panel power to usable electricity. Match the inverter to your grid connection, roof layout and whether you need battery backup.',
    guidance:
      'A standard grid-tied installation shuts down during a grid outage. Backup needs a compatible inverter, storage and the required isolation equipment. Confirm the complete design, not just the inverter label.',
    products: [
      {
        name: 'Deye',
        type: 'String & hybrid inverters',
        detail:
          'Grid-connected and battery-compatible product families. Battery and backup capability depend on the selected model.',
        source: 'https://www.deyeinv.com/',
      },
      {
        name: 'Polycab',
        type: 'Solar inverters',
        detail:
          'Solar inverter options, with current model specifications available through the manufacturer’s solar brochures.',
        source: 'https://polycab.com/product-brochures/solar-brochures',
      },
      {
        name: 'Enphase',
        type: 'Microinverters',
        detail:
          'IQ8 microinverters for panel-level power conversion. Module compatibility and the complete system design need checking.',
        source:
          'https://investor.enphase.com/news-releases/news-release-details/enphase-energy-launches-iq8-microinverters-high-powered-solar',
      },
      {
        name: 'Solis',
        type: 'String & storage inverters',
        detail:
          'Residential and commercial inverter families. Select the phase, capacity and storage configuration for your connection.',
        source:
          'https://www.ginlong.com/uploads/file/Solis_Technical_Brochure_IND.pdf',
      },
      {
        name: 'SolarEdge',
        type: 'Inverters & power optimisers',
        detail:
          'An inverter system using panel-level power optimisers and monitoring. Components must be selected as a compatible system.',
        source: 'https://www.solaredge.in/',
      },
    ],
  },
  {
    id: 'water-heaters',
    title: 'Solar water heaters',
    number: '03',
    description:
      'Use sunlight for hot water. A separate solar-thermal system, sized in litres per day rather than electrical kilowatts.',
    guidance:
      'Tell us your daily hot-water needs, water hardness, plumbing pressure and roof space. These determine tank size, collector type and whether auxiliary heating is needed. The rooftop electricity subsidy shown in our calculator does not cover water heaters.',
    products: [
      {
        name: 'Waaree',
        type: 'Solar water-heating enquiry',
        detail:
          'Waaree has listed solar water heaters in its solar-solutions portfolio. Ask us to verify the current range and local supply before selection.',
        source:
          'https://ftp.waaree.com/upload/media/waaree_energies_annual_report_2023_24_2_1758791038.pdf',
      },
      {
        name: 'NIKSOL',
        type: 'Vijayawada, Andhra Pradesh',
        detail:
          'Solar water-heating options including 100 and 200 LPD evacuated-tube systems, with larger capacities available to enquire about.',
        source: 'https://niksolenergysolutions.com/water-heaters',
      },
      {
        name: 'Solariq',
        type: 'Visakhapatnam, Andhra Pradesh',
        detail:
          'Solar water-heating systems offered by a local solar solutions company. Ask us to check capacity, water compatibility and supply.',
        source: 'https://solariq.co.in/solar-water-heaters',
      },
    ],
  },
];
