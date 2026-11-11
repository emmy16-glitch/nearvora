# Nearvora Nigeria production-readiness report

**Assessment date: 11 November 2026**

## Executive assessment

Nearvora is **not ready for production in Nigeria**. The stated current position is that the company is not incorporated, has no regulatory authorization, and has no custody provider. Nearvora wants actual third-party custodial crypto services together with Flutterwave NGN payment rails. Those are distinct capabilities: **Flutterwave is a payment processor, not crypto custody**, and the reviewed material does not establish that it will accept Nearvora’s crypto-related business. Its current terms place crypto-related activities in both pre-approval and prohibited categories, so availability is unresolved until Flutterwave confirms the exact activity and flows in writing and provides a signed merchant agreement. [1]

The first order of work is not a production integration. It is to establish the Nigerian entity, determine the exact activity and regulatory perimeter with Nigerian counsel and the regulators, and secure the required approvals and counterparties. SEC’s published framework treats custody of client virtual assets as regulated activity; the SEC’s 2026 capital circular lists ₦2 billion for a Digital Asset Custodian, but SEC must confirm the actual category or categories, current rules, and applicable transition treatment for Nearvora. [2] The CBN’s indexed 2026 non-security virtual-asset rules also need a commencement-date check before Nearvora treats them as effective. [3]

This is a practical product-readiness synthesis, **not legal advice**. The supplied findings are research, not a regulator determination, provider approval, or legal opinion. Nearvora should obtain qualified Nigerian legal and tax advice and written confirmations from SEC, CBN, banks, NDPC and prospective providers where indicated.

## 1. Immediate corporate and regulatory gates

### Incorporate and establish the local operating structure

Nearvora currently has no company, which is a threshold blocker. Incorporate the operating company through the Corporate Affairs Commission (CAC), determine its ownership and governance, establish its Nigerian registered office, and identify and file persons with significant control. SEC’s ARIP framework additionally specifies Nigerian incorporation, a Nigerian office and a resident CEO/MD for eligibility; an application or indication of interest does not itself authorize launch. [4]

The ARIP route is conditional: it has an initial assessment and formal application, and any AIP is limited to SEC’s conditions and scope. The published checklist calls for corporate records, an operating plan, fit-and-proper information, sponsored principal officers including an MD and Compliance Officer, audited accounts or a statement of affairs, tax and NFIU evidence, capital and a fidelity bond. Published SEC pages disagree on the initial assessment fee; confirm current requirements and fees through SEC’s live portal before paying. [5]

### Obtain an activity-by-activity SEC determination

Before product scope or capital is locked, map the intended functions: client-asset custody, wallet/key control, exchange, brokerage or intermediation, transfers, fiat on/off-ramp, token issuance and any fundraising. The activity—not merely the product label—determines which SEC registration or authorization categories may apply. The Investments and Securities Act 2025 gives SEC authority over VASPs, digital-asset operators, exchanges and custodians and prohibits unregistered capital-market or investment/securities business. [6]

The posted SEC digital-asset rules define a Digital Asset Custodian broadly as a person safeguarding, storing, holding or maintaining custody of virtual assets for another, and describe additional DAC registration and operational duties. Those posted rules cite the former 2007 Act, while the ISA 2025 is now enacted. Obtain written SEC confirmation of the operative rule basis, exact category combination and current checklist rather than assuming the older text is unchanged. [7]

If SEC classifies Nearvora as a DAC, its January 2026 circular publishes ₦2 billion minimum capital for that category, with affected entities to comply by 30 June 2027 and possible case-by-case transition arrangements. This is a published figure, **not yet a confirmed Nearvora requirement**: confirm category, capital computation, any additional categories and transition treatment directly with SEC. [2]

### Resolve the CBN perimeter and banking path

CBN’s 2023 designated-account guidelines say VASPs seeking the relevant accounts must show a valid SEC licence and meet documentation and account restrictions. The guidelines also impose controls on designated accounts and settlements; a bank account or payment-provider relationship does not authorize the underlying crypto activity. [8]

CBN’s official index lists 5 November 2026 non-security virtual-asset regulations covering custody, wallets, on/off-ramps and payment/merchant services. The text states commencement is to be specified in an issuing instrument, but the supplied findings do not establish that instrument or commencement date. Confirm status, scope and the relevant CBN category in writing before treating the framework or its stated capital provisions as effective for Nearvora. [3]

Also determine whether Nearvora itself would perform a regulated payment service or simply accept payments as a merchant through licensed providers. That depends on the actual contracting and funds flow, including wallet top-ups, third-party collection, settlement and custody. Flutterwave’s own switching/processing status is not a licence for Nearvora. [9]

### Build AML/CFT/CPF into the operating model

Before customer operations, establish a management-owned AML/CFT/CPF programme with a designated compliance function, customer and beneficial-owner identification, risk assessment, PEP and sanctions screening, source-of-funds/wealth controls where risk calls for them, ongoing transaction monitoring, investigation and escalation, staff training, independent testing and regulator-ready records. The supplied statutory and SEC findings include customer due diligence, ongoing monitoring, suspicious-transaction reporting, recordkeeping and AML programme obligations. [10]

The AML findings specify reporting of suspicious transactions to NFIU within 24 hours under the Money Laundering (Prevention and Prohibition) Act, and at least five-year retention periods for relevant records. The supplied NFIU guidance discusses investigating alerts within no later than 72 hours; the statutory reporting requirement remains the controlling obligation. Sanctions controls must support immediate freezes and reporting where required under the Terrorism (Prevention and Prohibition) Act. [10] [20] [21]

Implement crypto travel-rule information capture, verification, secure transfer and retention, including procedures for counterparties and unhosted wallets. Confirm current NFIU reporting channels and any category-specific expectations with the regulators before production. [11]

### Tax and customer-protection readiness

Obtain a company Tax ID and have Nigerian tax advisers validate company income-tax, VAT, customer reporting and transaction-level treatment before enabling transactions. The NRS’s 2026 virtual-asset circular describes Tax ID gating, records/reporting and interpretations concerning stamp duty, withholding and VAT. Because it is administrative guidance and detailed mechanics need reconciliation with legislation and current procedures, do not hard-code tax deductions or quote customer tax outcomes from this report alone. [12]

Before onboarding, prepare accurate disclosures covering custody and asset-control structure, risks, fees, withdrawal and transaction rights, complaints and appeals, service interruptions and cessation. SEC’s posted rules describe fair treatment, clear and non-misleading disclosures, risk and fee disclosures, complaints procedures, custody safeguards, cyber-risk controls, continuity planning and specified SEC incident notifications. Confirm current applicability under ISA 2025. [7]

## 2. Provider selection: custody and NGN rails are separate decisions

### Custody provider

No custody provider is selected or contracted. Nearvora needs written confirmation of each candidate’s current regulatory status, the contracting entity, authorization and permitted scope, customer eligibility, supported assets, custody/key-control model, segregation and reconciliation, audit access, incident and continuity commitments, data handling, fees, service limits and production onboarding. The provider’s marketing claims or historical directory entry are not enough.

The supplied research identifies three diligence leads, none yet verified as a ready Nearvora provider:

- **Quidax plus Fireblocks:** Fireblocks reports a Quidax integration for wallet generation, approvals and movement of funds, and describes a sub-custody proposition. This is a diligence lead, not proof that Quidax is currently authorized for the exact custody role, that the structure is approved for Nearvora, or that either provider will contract with it. [13]
- **Blockvault:** its website advertises custody via API or web platform, while the SEC directory entry supplied is for a RI period ending 28 August 2025. Confirm current authorization, service scope, onboarding and API availability directly. [14]
- **BitGo:** its site advertises institutional custody but makes services subject to eligibility and jurisdictional/regulatory requirements; Nigeria-specific acceptance is not established by the supplied findings. [15]

The operator’s own registration obligations may remain relevant even when custody is outsourced. Obtain SEC’s determination of the proposed arrangement and contract allocation before treating a vendor as transferring Nearvora’s regulatory or AML duties. [7]

### Flutterwave NGN rails

Treat Flutterwave as a **conditional prospective payment rail only**. Its October 2026 Nigeria terms conflict: crypto and related categories are described as requiring pre-approval, while cryptocurrency also appears in a prohibited sub-merchant list. No production account, credentials, approval or signed merchant agreement exists. Do not assume eligibility or disguise the activity. Submit the precise business model and each NGN collection/payout flow to Flutterwave’s compliance team and require written approval and a signed agreement before relying on it. [1]

Generic Flutterwave onboarding requirements—including corporate records, a verifiable website, IDs and operating licences where regulated—do not override sector restrictions. Payment processing is not custody: the reviewed Flutterwave materials do not establish safekeeping of crypto or private keys. [16]

## 3. Engineering gates before any production launch

Engineering should be built against the approved legal and provider operating model, not used to assume that approvals will follow. Before production, Nearvora should have:

1. **Custody and ledger controls:** a regulator-reviewed custody architecture; explicit ownership and control boundaries; secure key/transaction authorization; client-asset segregation and reconciliation; complete customer, fiat and on-chain audit trails; recovery and withdrawal controls; and tested failure handling. SEC’s posted custody rules describe safeguards, access controls, records, risk management and business continuity. [7]
2. **AML and sanctions workflows:** KYC/beneficial-owner and Tax ID capture as applicable; screening and risk scoring; wallet/transaction monitoring; travel-rule data handling; alert investigation; sanctions blocking/freezing; case management; STR escalation; and immutable, searchable records. The relevant statutory and SEC duties are described above. [10] [11] [12] [20]
3. **Privacy and security:** map personal-data categories, purposes, lawful bases, vendors, locations and cross-border transfers; provide clear notices and rights handling; assess DPIA needs; use written processor terms; and test access, resilience, incident response and deletion/retention controls. NDPA applies independently of crypto licensing. The NDPC guidance identifies fintech/financial-sector processing as an Ultra-High Level category; confirm Nearvora’s precise classification and current registration steps. [17] [19]
4. **Customer operations:** publish accurate risk, fee, custody and service-continuity disclosures; provide complaint, escalation and appeal handling; train support and compliance staff; and maintain incident and business-continuity playbooks. Do not present proposed or uncommenced standards as binding deadlines. [7] [17] [19]
5. **Tax-aware records and reconciliation:** preserve event-level timestamps, counterparties, asset quantities, fiat/token legs, fees, valuations and source evidence, cost basis, applicable tax calculations, remittances and filed returns. Confirm tax treatment and filing formats with NRS and advisers before automating deductions. [12]

A sandbox or development integration is not production authorization. Do not process customer funds or assets, activate public customer onboarding, or describe custody/rails as live until regulatory, commercial, security and operational gates are independently closed.

## 4. Vercel and deployment gates

Vercel is the chosen deployment target. This research did not inspect the project’s Vercel account, deployed environment variables, data locations, subprocessors or configuration, so it makes no claim that the current deployment satisfies Nigerian requirements. Review those details against the approved data-flow, security, privacy and regulatory design before production use.

Before any production deployment, document where Nigerian payment and customer data, backups, logs, analytics and support access will be stored or managed, including subcontractors and access from other countries. The supplied findings flag a CBN payment-system data-localisation circular effective 1 January 2027 for specified regulated participants; whether it applies directly to Nearvora is not established, but the deployment architecture should be checked against the obligations of licensed partners and any future Nearvora authorization. [18]

Use separate development, test and production environments; do not put real customer or key material in test systems. Keep secrets out of client bundles and source control, restrict and audit administrative access, enable monitoring and tested backups, and have release rollback and incident procedures. These are practical deployment controls, not a representation that any unreviewed hosting setup meets a particular legal standard. Complete privacy and vendor-transfer review and obtain provider/regulator acceptance before production data or transaction traffic is routed through the deployed app. [17] [18]

## 5. What can safely be built before approval

Nearvora can make useful progress without taking custody or handling live customer funds or personal data:

- Incorporation preparation, ownership/governance records, product activity mapping, regulator questions, application materials and provider due diligence.
- A non-production application shell, mock onboarding, synthetic KYC and transaction data, paper ledgers, sandbox-only API adapters where the provider expressly permits them, and simulated custody/payment flows.
- Draft AML, privacy, security, complaints, incident-response, continuity and tax-control designs; threat modelling and architecture reviews using synthetic data.
- A provider-neutral integration layer with explicit disabled production switches, so custody and payment components can be enabled only after signed contracts, credentials, written approvals and completed compliance checks.
- Internal testing of reconciliation, transaction state machines, idempotency, failure recovery, audit logs and monitoring using synthetic or otherwise properly authorized test data.

Do **not** take custody, solicit deposits, execute real crypto/NGN conversion, open customer accounts for the service, represent the app as authorized or custody-ready, or move real personal data into production until the required approvals and agreements are confirmed. [2] [7] [8] [10] [17]

## 6. Practical decision sequence

1. **Form the Nigerian company** and establish local governance, office and responsible officers. [4][5]
2. **Freeze a precise product/funds-flow specification** and get Nigerian counsel’s activity map; obtain written SEC category/rule confirmation and CBN status/perimeter clarification, including the 2026 commencement instrument. [3][6][7]
3. **Confirm licensing, capital and application route** before budget approval; do not assume ARIP/AIP is a full licence or that one category covers all functions. [2][5]
4. **Run parallel, conditional provider diligence:** secure written Flutterwave acceptance for exact NGN flows and compare custody providers on current authorization, contracting entity and architecture. Sign no production assumptions into the product until approved. [1][13][14][15]
5. **Complete AML, privacy, tax, custody, customer-protection and operational controls**, then test them with non-production data and obtain required reviews. [10][12][17]
6. **Pass production go/no-go only when** regulatory authorization, banking/payment and custody contracts, production credentials, controls, data-transfer review, tax operations, incident readiness and customer disclosures are all evidenced and signed off.

## References

[1]: https://flutterwave.com/ng/terms "Flutterwave Terms & Conditions (Nigeria; updated October 2026)"
[2]: https://sec.gov.ng/for-investors/keep-track-of-circulars/revised-minimum-capital-mc-for-regulated-capital-market-entities/ "Revised Minimum Capital for Regulated Capital Market Entities (published 16 January 2026)"
[3]: https://www.cbn.gov.ng/Documents/PaymentsSystemGuidelines.html "CBN Payments System Guidelines index"
[4]: https://www.cac.gov.ng/ "CAC official corporate registry and company registration portal"
[5]: https://sec.gov.ng/about/resources/checklists/accelerated-regulatory-incubation-program-arip-checklist-for-vasp-onboarding/ "ARIP Checklist for VASP Onboarding"
[6]: https://sec.gov.ng/documents/1319/Investments_and_Securities_Act_2025_x9rSXtI.pdf "Investments and Securities Act 2025"
[7]: https://sec.gov.ng/documents/8/Rules-on-Issuance-Offering-and-Custody-of-Digital-Assets.pdf "Rules on Issuance, Offering Platforms and Custody of Digital Assets"
[8]: https://www.cbn.gov.ng/out/2024/fprd/guidelines%20on%20operations%20of%20bank%20accounts%20for%20virtual%20asset%20providers.pdf "Guidelines on Operations of Bank Accounts for Virtual Assets Service Providers"
[9]: https://www.cbn.gov.ng/PaymentsSystem/PSPs.html "CBN Payment Service Providers"
[10]: https://www.nfiu.gov.ng/LawsAndRegulations?fileName=Money+Laundering+%28Prevention+and+Prohibition%29+Act%2C+2022&filePath=C%3A%5CNFIU%5Cwwwroot%5Cdocuments%5CMLp_9GKCQR&handler=PreviewFile "Money Laundering (Prevention and Prohibition) Act, 2022"
[11]: https://home.sec.gov.ng/documents/7/SEC-AMLCFTCPF-REGULATIONS-12-MAY-2022.pdf "SEC Capital Market Operators AML/CFT/CPF Regulations, 2022"
[12]: https://www.nrs.gov.ng/uploads/Guidelines_on_taxation_of_Virtual_Assets_31_7_26_7cd2ef8dab.pdf "Guidelines on the Taxation of Virtual Assets, Information Circular No. 2026/21"
[13]: https://www.fireblocks.com/customers/quidax "How Quidax Secures and Scales its Operations with Fireblocks"
[14]: https://sec.gov.ng/fintech-and-innovation-hub-finport/registered-fintech-operators/ "Registered FinTech Operators"
[15]: https://www.bitgo.com/ "BitGo"
[16]: https://flutterwave.com/ng/support/onboarding/onboarding-requirements-for-using-flutterwave-in-nigeria "Requirements for opening a business account in Nigeria"
[17]: https://ndpc.gov.ng/wp-content/uploads/2024/03/Nigeria_Data_Protection_Act_2023.pdf "Nigeria Data Protection Act, 2023"
[18]: https://www.cbn.gov.ng/Out/2026/CCD/CIRCULAR%20ON%20INTRODUCTION%20OF%20MARKET%20STRUCTURE%20REQUIREMENTS,%20DATA%20LOCALISATION,%20ULTIMATE%20BENEFICIAL%20OWNERSHIP%20DISCLOSURE,%20AND%20SYSTEMIC%20OVERSIGHT%20MEASURES%20IN%20THE%20NIGERIA%20PAYMENTS%20SYSTEM.pdf "Circular on Market Structure Requirements, Data Localisation, UBO Disclosure and Systemic Oversight"
[19]: https://ndpc.gov.ng/wp-content/uploads/2025/07/Updated-Guidance-Notice-on-Registtration-2024.pdf "Guidance Notice on Registration of Data Controllers and Data Processors of Major Importance"
[20]: https://nfiu.gov.ng/LawsAndRegulations?fileName=Terrorism+%28Prevention+and+Prohibition%29+Act%2C+2022&filePath=C%3A%5CNFIU%5Cwwwroot%5Cdocuments%5CTPp_DFV8G6&handler=PreviewFile "Terrorism Prevention and Prohibition Act, 2022"
[21]: https://nfiu.gov.ng/AdvisoryAndGuidance?filePath=C%3A%5Cinetpub%5Cwwwroot%5CNFIU%5Cwwwroot%5Cdocuments%5CN_BRWMBQ&fileName=Guidelines%20for%20the%20Identification,%20Verification%20and%20Reporting%20of%20Suspicious%20Transactions%20Related%20to%20Money%20Laundering,%20Financing%20of%20Terrorism%20and%20Proliferation%20of%20Weapons%20of%20Mass%20Destruction%20%28ML%2FTF%2FPF%29%20for%20Financial%20Institutions&handler=PreviewFile "NFIU Guidelines for Identifying and Reporting Suspicious Transactions, 2024"
