import { Link } from 'react-router-dom';
import { useEffect } from 'react';

type LegalPageProps = {
  type: 'terms' | 'privacy' | 'refund';
};

const pages = {
  terms: {
    eyebrow: 'Legal',
    title: 'Terms and Conditions',
    titleLines: ['Terms and', 'Conditions'],
    accentLineIndex: 1,
    lastUpdated: '29 May, 2026',
    intro: 'These Terms and Conditions govern access to and use of www.homefeet.in, including property listing, browsing, membership, communication, payment, and marketplace services offered through the platform.',
    sections: [
      ['1. Definitions', `Unless otherwise specified, capitalized terms shall have the meanings set out below.

Account means the account created on the Platform by a User in accordance with these Terms and approved or verified by www.homefeet.in.

Agreement means these Terms and Conditions, the Privacy Policy, Refund and Cancellation Policy, and any other terms mutually agreed between www.homefeet.in and the User in relation to the Services.

Applicable Law means any statute, law, regulation, rule, order, judgment, directive, guideline, policy, code of practice, or governmental or regulatory decision applicable to the Agreement, the Platform, or the Services.

Broker or Mediator means any broker, mediator, channel partner, sales agency, property dealer, middleman, real estate agent, or other third party who introduces or negotiates between parties in relation to sale, purchase, development, joint development, lease, leave and license, or any other property transfer.

Computer Virus means any instruction, information, data, code, file, script, program, malware, worm, trojan, or other component that may destroy, damage, degrade, interrupt, or adversely affect any computer resource or Platform operation.

Confidential Information means non-public information relating directly or indirectly to the Platform, business processes, policies, subscription plans, publications, records, reports, users, properties, documents, databases, agreements, pricing, financial information, intellectual property, trade secrets, and operational systems of www.homefeet.in or its Users.

Content means any information, data, listing details, text, images, maps, documents, videos, communications, reviews, reports, or other material available on or submitted to the Platform.

Government Authority means any government, court, tribunal, regulator, department, board, commission, law enforcement agency, or other authority having jurisdiction over the Agreement or Services.

Information Technology Act means the Information Technology Act, 2000, and rules made thereunder.

Intellectual Property means patents, inventions, know-how, trade secrets, trademarks, service marks, designs, software, databases, methods, processes, systems, documents, records, ideas, concepts, discoveries, developments, and copyrightable works whether registered or unregistered.

Intellectual Property Rights means all rights in Intellectual Property, including rights under patent, trademark, copyright, design, common law, licenses, permissions, applications, registrations, renewals, extensions, causes of action, damages, profits, and Confidential Information.

Personal Information means information that identifies a User, including name, phone number, email address, account details, property records, financial transaction references, KYC or verification documents voluntarily provided, and other sensitive personal data as defined by Applicable Law.

Platform or Site means www.homefeet.in and any related web pages, digital tools, applications, forms, dashboards, communication flows, listing pages, and payment journeys operated by www.homefeet.in.

Prohibited Conduct includes breach of these Terms, violation of Applicable Law, infringement of third-party rights, unauthorized access, spam, obscene or unlawful material, impersonation, false affiliation, fraudulent listings, scraping, framing, mirroring, reverse engineering, or use of the Platform to mislead, harass, or harm any person.

Registration Data means the mobile number, email address, name, account type, and any other information required from the User at the time of registration or account verification.

Services means the services provided by www.homefeet.in within India, including property listing, property discovery, development opportunity discovery, buyer and seller matching, builder-owner communication workflows, listing moderation, membership access, contact unlocks, payment facilitation, and related real estate marketplace services.

Third Party Service Provider means any payment gateway, SMS gateway, hosting provider, database operator, map provider, verification partner, finance partner, technology provider, or other service provider engaged in relation to the Services.

User means any person who accesses the Platform or avails Services for browsing, hosting, publishing, sharing, transacting, displaying, uploading, communicating, listing, buying, selling, mediating, building, or developing property-related information.

User Information means Registration Data, Personal Information, listing details, documents, Content, and any other information provided by a User to www.homefeet.in through the Platform, email, phone, chat, forms, or any other communication channel.`],
      ['2. Interpretation', `Unless the context otherwise requires, references to any law include amendments, supplements, subordinate legislation, and re-enactments from time to time.

Any reference to a person includes an individual, company, partnership, trust, association, governmental agency, and their successors, permitted assigns, legal representatives, administrators, executors, and heirs.

Headings are used only for ease of reference and shall not affect interpretation.

The singular includes the plural and vice versa. Words importing one gender include all genders.

The words other, otherwise, including, and whatsoever shall not limit the generality of preceding words or matters.`],
      ['3. Acceptance of the Terms and Conditions', `www.homefeet.in agrees to provide the Services and the User agrees to access and use the Services in accordance with this Agreement.

By accessing the Platform, completing registration, posting a listing, purchasing a membership, submitting property information, or using any Service, the User agrees to be bound by these Terms and the Privacy Policy.

The User represents and warrants that the User is 18 years of age or above and is capable of entering into a legally binding agreement. Individuals below 18 years may use the Platform only under the involvement, guidance, and supervision of a parent or legal guardian.

These Terms replace all previous arrangements between the User and www.homefeet.in in relation to access to the Platform and Services.`],
      ['4. Access to the Site', `First-time Users may access the Platform for preliminary browsing without creating an Account.

Users must provide User Information and create an Account to retrieve specific information, unlock contact access, post listings, submit interest, purchase membership, or use restricted Services.

www.homefeet.in may verify an Account using mobile OTP, email verification, manual review, document review, or any other reasonable verification process.

A mobile number may be used only once to create an Account unless otherwise approved. Users are prohibited from creating multiple misleading or duplicate Accounts.

Users agree to cooperate with reasonable verification, security, and support requests made by www.homefeet.in.`],
      ['5. Subscription Plans', `www.homefeet.in may offer membership plans or premium Services that Users may subscribe to upon payment of applicable fees.

Paid membership access begins after successful payment confirmation and remains valid for the selected billing period or plan duration.

Subscription fees are non-refundable except as specifically set out in the Refund and Cancellation Policy.

www.homefeet.in reserves the right to revise plan names, features, pricing, limits, validity, or access rules before purchase or renewal. Any revised fees or access rules will apply prospectively unless required otherwise by Applicable Law.`],
      ['6. User Information', `www.homefeet.in is not responsible for the accuracy, quality, legality, integrity, reliability, appropriateness, or intellectual property status of User Information submitted by Users.

Users are responsible for keeping their submitted information complete, accurate, current, lawful, and non-misleading.

www.homefeet.in may withhold, remove, reject, return, edit, moderate, disable, or discard any User Information, in whole or in part, at its discretion where required for safety, compliance, marketplace quality, or operational reasons.

www.homefeet.in may maintain, forward, review, or verify User Information provided through the Platform or otherwise, but has no obligation to independently verify every submission.`],
      ['7. Rights of www.homefeet.in', `www.homefeet.in may reject, suspend, disable, or terminate an Account if the User violates Applicable Law, these Terms, listing rules, payment rules, trust and safety standards, or any safe-use requirement of the Platform.

www.homefeet.in may conduct internal checks, listing moderation, contact access controls, and verification steps to reduce spam, fraudulent listings, duplicate listings, unauthorized broker behavior, or misuse.

www.homefeet.in may modify, suspend, or terminate any part of the Services, features, structure, fees, layout, access rules, or User Account without prior notice where reasonably necessary.

www.homefeet.in may issue notifications, confirmations, alerts, service messages, promotional information, or other communications through the Platform, email, SMS, phone, WhatsApp, or other communication channels agreed by the User. Users may opt out of promotional messages by contacting contact@homefeet.in, while operational messages may continue.`],
      ['8. Data Protection Rights', `Subject to Applicable Law, Users may request access, correction, deletion, restriction, or withdrawal of consent in relation to their Personal Information.

Requests may be raised through the account dashboard where available or by writing to contact@homefeet.in.

Certain information may be retained where required for legal, fraud prevention, accounting, security, dispute resolution, or legitimate business purposes.`],
      ['9. Unauthorized Access', `The User is liable for all acts conducted through the User Account and is responsible for safeguarding login credentials, OTPs, devices, and account access.

The User must immediately notify www.homefeet.in upon becoming aware of unauthorized access, misuse, suspected breach, or compromise of the Account.

www.homefeet.in may suspend, terminate, or restrict an Account to protect the User, other Users, or the Platform. www.homefeet.in shall not be liable for loss caused by unauthorized access where the User failed to maintain account security or delayed informing www.homefeet.in.

Users are encouraged to keep devices secure and avoid sharing OTPs or login credentials.`],
      ['10. Use of Information', `Procurement, storage, usage, and dissemination of User Information shall be handled in accordance with the Information Technology Act, 2000, rules made thereunder, the Privacy Policy, and other Applicable Law.

The User authorizes www.homefeet.in to use User Information for providing Services, account management, listing moderation, buyer-owner-builder-mediator communication, contact unlocks, payment processing, support, internal research, fraud prevention, security, compliance, and service improvement.

www.homefeet.in may share User Information with employees, directors, officers, advisors, auditors, legal counsel, authorized representatives, and Third Party Service Providers on a need-to-know basis for delivering the Services.

Where a User interacts with a listing, requests contact, submits interest, or uses a marketplace communication tool, relevant contact and requirement details may be shared with the concerned owner, buyer, builder, mediator, or authorized service provider.

Users consent to alerts, contact details, service messages, promotional messages, calls, SMS, email, WhatsApp, and other communications in relation to the Services, subject to opt-out rights under Applicable Law.`],
      ['11. Third Party Services and Tailored Advertising', `www.homefeet.in may engage Third Party Service Providers directly or indirectly to provide payment processing, SMS, hosting, maps, verification, analytics, finance, and other related Services.

Users agree that information may be shared with Third Party Service Providers where necessary for service delivery, support, verification, payment, analytics, security, or compliance.

The Platform may include advertisements, recommendations, external links, map integrations, or third-party tools. Interactions with third parties are solely between the User and such third party.

Third Party Service Providers may use cookies or similar technologies to understand usage patterns, optimize advertisements, and report interactions. www.homefeet.in does not guarantee the accuracy, integrity, quality, or legality of any third-party content, service, or offer.

All third-party services are provided on an as-is and where-is basis unless specifically stated otherwise.`],
      ['12. HomeFeet Platform', `Users acknowledge that www.homefeet.in is an online marketplace and facilitator for property information, property discovery, listing moderation, membership access, and communication workflows.

Users are ultimately responsible for choosing, communicating with, and transacting with other Users. www.homefeet.in does not guarantee the intent, capacity, title, ownership, authority, financial ability, or legal compliance of any User or listing.

Listing information is primarily submitted by Users and may become outdated, inaccurate, incomplete, or disputed. Users must independently verify all property information, ownership records, approvals, encumbrances, RERA details, zoning, title, measurements, pricing, access roads, legal status, and commercial terms before making decisions.

Any interaction, negotiation, dispute, fraud claim, transaction, or service issue between Users or third parties is strictly between the concerned parties. Users engage at their own risk.

www.homefeet.in cannot assure that any listing will lead to a completed transaction, contact response, deal closure, or successful development arrangement.`],
      ['13. HomeFeet Payment Terms', `Registered Users may choose to make membership or premium service payments through authorized third-party payment gateways.

Users must provide accurate, current, and complete billing and account information while making payments. www.homefeet.in is not responsible for loss caused by incorrect payment or account information provided by the User.

Except for facilitating payment processing through authorized payment gateways, www.homefeet.in is not a bank, financial institution, payment network, or credit provider.

Payment gateways, processors, card networks, banks, UPI providers, wallets, and other financial institutions may impose additional terms, fees, timelines, limits, reversals, or verification requirements.

www.homefeet.in may delay, suspend, reject, cancel, or review any transaction that appears unauthorized, suspicious, fraudulent, disputed, unlawful, risky, or unusual.

Chargebacks, payment reversals, refunds, failed payments, duplicate payments, and failed activation cases shall be handled according to the Refund and Cancellation Policy and payment gateway rules.

Refunds, where approved, will be processed to the original payment method subject to payment gateway and bank timelines.`],
      ['14. Content on the Site', `www.homefeet.in shall endeavor to monitor Content on the Platform to reduce violations of Applicable Law and these Terms.

Users shall not attempt unauthorized access, violate Intellectual Property Rights, send spam, upload unlawful material, transmit harmful code, disrupt Platform integrity, commercially exploit the Services without authorization, create unauthorized links, frame or mirror the Platform, reverse engineer the Platform, or copy ideas, features, functions, designs, or graphics from the Platform.

Users must ensure all uploaded listings, photos, videos, maps, documents, descriptions, and communications are lawful, accurate, and authorized.`],
      ['15. User Generated Content', `The Platform may contain User Generated Content, including listings, descriptions, images, media, comments, communication records, and property information.

Views, claims, descriptions, and representations in User Generated Content belong to the submitting User and do not represent the views or guarantees of www.homefeet.in.

Users retain ownership of their submitted Content, subject to a license granted to www.homefeet.in to host, display, process, moderate, analyze, share, transmit, and use such Content for providing and improving the Services.

www.homefeet.in may monitor, edit, reject, hide, or remove User Generated Content where it considers appropriate or necessary.`],
      ['16. Intellectual Property', `www.homefeet.in respects Intellectual Property Rights and expects Users to do the same.

Users are solely responsible for ensuring they have ownership or permission to upload, publish, or share any Content on the Platform.

Users shall not use Platform Content to charge unauthorized brokerage, misrepresent information as their own, copy listings, scrape data, create competing products, or infringe the Intellectual Property Rights of www.homefeet.in or any third party.

www.homefeet.in reserves the right to initiate legal proceedings against any User or third party for infringement or misuse of Intellectual Property Rights.

Users acknowledge that www.homefeet.in retains Intellectual Property Rights in the Platform, design, brand, software, databases, workflows, and aggregated or derived marketplace intelligence.`],
      ['17. Operational Hazards and Computer Virus Attacks', `www.homefeet.in does not warrant that the Platform or software used for operations will always remain free from harmful components, operational hazards, bugs, viruses, worms, trojans, or related components.

www.homefeet.in shall endeavor to keep the Platform secured according to reasonable industry practices.

www.homefeet.in shall not be liable for damage caused by performance failure, error, omission, interruption, deletion, defect, delay, virus, link failure, site crash, software or hardware malfunction, network unavailability, communication failure, theft, destruction, or unauthorized access, except to the extent required by Applicable Law.`],
      ['18. Disclaimer', `Information and opinions on the Platform are general marketplace information and do not constitute legal, financial, investment, tax, valuation, architectural, engineering, development, title, or real estate advice.

Users should make independent inquiries and obtain professional advice before making legal, financial, investment, development, or real estate decisions.

Measurements, prices, locations, land details, zoning, frontage, maps, and commercial terms displayed on the Platform are approximate or User-submitted and may contain errors, omissions, or misunderstandings.

Services are chosen and used at the User risk and discretion. www.homefeet.in makes no express or implied warranties regarding merchantability, fitness for a particular purpose, uninterrupted access, technical error-free operation, listing accuracy, transaction completion, or results obtained from use of the Services.

www.homefeet.in is not responsible for third-party reports, market studies, external links, payment gateway actions, third-party charges, disputes between Users, or losses arising from User Prohibited Conduct.`],
      ['19. Finance Partners', `If Users request financing, loan assistance, or related third-party financial services through the Platform, the User authorizes www.homefeet.in to share relevant information with finance partners for eligibility evaluation, communication, verification, and service delivery.

By submitting a finance inquiry, the User authorizes finance partners to contact the User by phone, SMS, email, WhatsApp, or other communication modes regarding the inquiry and related products.

The User understands that finance partners may require additional documents and may impose separate terms and conditions. www.homefeet.in shall not be liable for finance partner decisions, rejections, delays, charges, or disputes.`],
      ['20. Limitation of Liability', `To the maximum extent permitted by law, the total aggregate liability of www.homefeet.in under this Agreement shall be limited to the fees paid by the User for the specific Service giving rise to the claim.

www.homefeet.in shall not be liable for indirect, incidental, special, exemplary, punitive, or consequential damages, including lost profits, loss of data, loss of goodwill, lost opportunity, transaction failure, or business interruption.`],
      ['21. Indemnity', `Users shall indemnify and hold harmless www.homefeet.in, its officers, directors, employees, agents, partners, and representatives from losses, costs, expenses, claims, suits, damages, penalties, and reasonable attorney fees arising from a User act or omission.

This includes breach of these Terms, infringement of third-party Intellectual Property, violation of Applicable Law, gross negligence, willful misconduct, fraudulent acts, misleading listings, unauthorized property marketing, payment disputes, or claims made by Government Authorities.`],
      ['22. Real Estate Regulatory Authority', `Users are deemed aware of rules and regulations applicable under the Real Estate (Regulation and Development) Act, 2016 and the concerned state RERA authority.

www.homefeet.in recommends that Users periodically visit the relevant RERA website and verify approvals, registrations, project details, and property status before finalizing any deal or transaction.

www.homefeet.in does not endorse or advertise any property as legally compliant merely because it appears on the Platform. Users must independently verify legal and regulatory compliance.`],
      ['23. User Grievance', `Any grievance relating to discrepancies, misuse of information, Platform access, listing concerns, or legal notices may be addressed to the designated grievance desk.

Designation: Grievance Officer, HomeFeet Portal

Email: contact@homefeet.in

The grievance desk shall address the grievance within one month from the date of receipt, subject to Applicable Law.`],
      ['24. Guidelines for Law Enforcement Agencies and Report a Fraud', `Law enforcement agencies may send legal requests, notices, or assistance requests to contact@homefeet.in.

Users may also report suspected fraud, unauthorized listings, impersonation, payment misuse, or security concerns through contact@homefeet.in.

www.homefeet.in will endeavor to respond to valid legal and fraud-related requests within a reasonable timeline, subject to verification, Applicable Law, and the nature of the request.`],
      ['25. Waiver and Severability', `No failure or delay by www.homefeet.in in exercising any right or remedy shall operate as a waiver.

If any term is declared invalid or unenforceable by a competent court, the remaining terms shall continue in full force.

Invalid or unenforceable provisions shall be interpreted to reasonably reflect the intended commercial and legal purpose of the provision.`],
      ['26. Amendment', `www.homefeet.in may change, update, or modify this Agreement, in whole or in part, without prior notice, provided that updated terms are made available on the Platform.

Continued use of the Platform after publication of updated terms shall be deemed acceptance of such changes.`],
      ['27. Governing Law and Jurisdiction', `This Agreement shall be governed by and construed in accordance with the laws of India.

Any action, claim, dispute, or difference arising out of or in connection with this Agreement shall be subject to the jurisdiction of competent courts in Hyderabad, Telangana, India, unless www.homefeet.in chooses another jurisdiction permitted by Applicable Law for enforcement or protection of its rights.`],
    ],
  },
  privacy: {
    eyebrow: 'Privacy',
    title: 'Privacy Policy',
    titleLines: ['Privacy', 'Policy'],
    accentLineIndex: 0,
    lastUpdated: 'May 26, 2026',
    intro: 'www.homefeet.in (the "Company", "we", "us", or "our") is committed to respecting your online privacy and recognizes your need for appropriate protection and management of the personal information you share with us.',
    sections: [
      ['Policy Scope', 'This Privacy Policy describes how the Company collects, uses, discloses, stores, and transfers personal data of users while browsing the Platform or availing our real estate marketplace services (the "Services"). This Policy applies to all users of our Platform, including property buyers, investors, independent plot owners, dealers, brokers, builders, and general website visitors.'],
      ['1. Collection of Personal Data and Sensitive Personal Information (SPDI)', 'In accordance with the IT (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011, we collect information necessary to provide a secure, verified, and efficient property-matching ecosystem.\n\nA. Personal Data (Information You Give Us Directly)\n\nUser Profile & Registration Details: Your name, email address, verified mobile numbers, and account login credentials.\n\nProperty Listings & Real Estate Data: Detailed information regarding plots or properties you own or are authorized to market. This includes property types (commercial, residential, agricultural land), exact layout dimensions, survey numbers, pricing details, road connectivity parameters, RERA registration status, and uploaded media (photographs, maps, or video walkthroughs).\n\nCommunication & Support Records: Records of chats, emails, telephone logs, or feedback forms established with you to resolve support queries or implement portal updates.\n\nB. Sensitive Personal Data or Information (SPDI)\n\nTo comply with Indian law, we explicitly categorize and protect SPDI. We may collect:\n\nFinancial Transaction Data: When you purchase a premium membership plan, you are redirected to an authorized, encrypted third-party payment gateway interface. We do not store and do not have access to your core financial assets, such as bank account numbers, credit/debit card numbers, CVVs, or UPI PINs. We receive only transaction status tokens.\n\nVerification & Due Diligence Documents: Land ownership title records, electricity/utility bills, or sales deeds uploaded by sellers to verify listing legitimacy.\n\nGovernment Identifiers Note: Any government-issued identification documentation uploaded voluntarily during broker/owner verification is used strictly for identity authentication purposes under encrypted channels and is systematically redacted from public viewing.\n\nC. Automatically Collected Data & Technical Metrics\n\nUsage Data: Search queries, filtering preferences, property viewing histories, intent capture, and time spent on listing pages.\n\nTechnical Parameters: IP addresses, browser specifications, operating systems, hardware models, unique device identifiers, and network connection logs.\n\nCookies & Tracking Identifiers: Small files downloaded to your device to maintain session continuity, remember your portal preferences, and monitor statistical marketplace trends.'],
      ['2. Purpose of Collection and Usage of Your Data', 'The Company collects and processes your personal data for clear, lawful purposes connected directly to our functions as a digital real estate portal:\n\nProvision of Platform Services: Administering your account onboarding, publishing your land layouts or plot listings, and displaying them to prospective buyers.\n\nLead Generation & Marketplace Connectivity: Enabling direct communication workflows between buyers, sellers, brokers, and builders. When a user actively expresses interest in a property or finance option, contact details are bridged to fulfill that specific request.\n\nListing Verification & Trust Enforcement: Conducting internal platform moderation, validating listing data, and identifying or removing fraudulent, speculative, or duplicate land listings.\n\nService Optimization: Reviewing technical error logs and feedback to continuously refine platform layouts, algorithmic performance, and property-matching features.\n\nLegal Obligation & Protection: Complying with legal mandates under Indian law, protecting the safety and integrity of our Platforms, and establishing defenses against active or prospective legal claims.'],
      ['3. Disclosure and Sharing of Information', 'We do not sell, rent, or trade your personal information to third parties for marketing purposes. Your data is disclosed strictly under the following transparent marketplace contexts:\n\nInter-User Connections: If you click options such as "View Contact Number" or "Inquire About Layout" on a specific plot listing, your contact parameters are disclosed to the respective owner, developer, or authorized broker to facilitate the transaction.\n\nAuthorized Service Providers: Trusted third-party vendors, IT coordinators, SMS gateway partners, database operators, and on-field layout verifiers who assist in executing our platform services under strict confidentiality agreements.\n\nFinancial Partners: Participating banks or Non-Banking Financial Companies (NBFCs), strictly in instances where you submit an explicit expression of interest regarding home loans or property financing.\n\nLegal and Regulatory Compulsion: We may disclose data if required to do so by law, or in response to subpoenas, court orders, or administrative requests from government bodies or law enforcement agencies empowered under Indian law.\n\nCorporate Restructuring: In the event of a merger, corporate reorganization, amalgamation, asset sale, or acquisition by another corporate entity, your data will be transferred subject to a continuity of protection standards.'],
      ['4. Data Storage, Retention, and Security Practices', 'Reasonable Security Practices: In accordance with Section 43A of the IT Act, 2000, HomeFeet implements physical, electronic, managerial, and procedural safeguards that comply with Indian regulatory standards to defend data against unauthorized access, alteration, disclosure, or destruction.\n\nLocal Hosting: Our primary digital vaults, user directories, and listing databases are securely processed and hosted on cloud server infrastructures.\n\nRetention Limitations: We retain your personal data only for as long as it is necessary to provide you with active Services on the Platform, or as required to satisfy statutory audits, accounting trials, tax laws, or ongoing fraud prevention investigations under Indian law. Post-closure, data may persist solely in an aggregated, anonymized format that cannot be used to identify you.'],
      ['5. User Rights and Options', 'As a data provider, you hold specific rights under Indian law regarding your personal footprint on our portal:\n\nReview and Correction: You have the right to access, review, modify, or correct your personal identifiers and listing catalogs directly through your account dashboard.\n\nWithdrawal of Consent: You may withdraw your consent for any or all future processing of your data by writing to our administrative helpdesk. However, if that data is essential to basic portal functionality (for example, a verified mobile number for listing properties), withdrawal of consent may result in the suspension or termination of your platform privileges.\n\nOpt-Out Mechanics: You can unsubscribe from marketing communication loops or regional land update newsletters by utilizing the "Unsubscribe" link inside our emails or contacting our team. Operational notifications (payment receipts, account security alerts) will continue unhindered.'],
      ['6. Third-Party Links', 'Our listing pages may feature advertisements, integrated maps, or links pointing toward external developer or third-party web portals. This Privacy Policy is strictly confined to www.homefeet.in. We do not exercise control over, and are not responsible for, the individual data policies or cookie handling standards employed by external websites.'],
      ['7. Minor Protection Policy', 'The HomeFeet portal is strictly intended for adult consumers capable of entering into legally binding real estate contracts under the Indian Contract Act, 1872. We do not knowingly track, compile records, or market services to individuals under 18 years of age.'],
      ['8. Grievance Redressal Mechanism', 'In compliance with Rule 5(9) of the IT (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011, any discrepancies, complaints, or questions regarding the processing of your personal information must be directed to our designated Grievance Officer.\n\nDesignated Desk: Grievance Officer, HomeFeet Portal\n\nContact Email: contact@homefeet.in\n\nMailing Reference: www.homefeet.in, Hyderabad, Telangana\n\nThe Grievance Officer will acknowledge your grievance within 48 hours of receipt and methodically investigate and redress the issue within the statutory timeline of one (1) month from the date of receiving your formal written complaint.'],
    ],
  },
  refund: {
    eyebrow: 'Payments',
    title: 'Refund and Cancellation Policy',
    titleLines: ['Refund and', 'Cancellation', 'Policy'],
    accentLineIndex: 1,
    lastUpdated: 'May 26, 2026',
    intro: 'This policy explains the cancellation and refund handling procedures for all membership and premium service payments made on www.homefeet.in (the "Platform"). By purchasing a membership plan, you agree to the terms outlined below.',
    sections: [
      ['1. Membership Plans & Activation', 'Immediate Access: Access to your selected premium tier or membership plan begins immediately upon successful payment confirmation from our gateway provider.\n\nDuration: Your membership remains active and valid for the entire duration of the specific billing cycle or plan period you selected at the time of purchase.'],
      ['2. Cancellation Policy', 'Voluntary Discontinuation: You are free to stop using the platform services at any time.\n\nNo Auto-Termination: Voluntarily stopping usage or deleting your account profile does not automatically cancel or trigger a refund for an active, paid membership period. Paid access will simply run its course until the expiration date of the current cycle.'],
      ['3. Refund Eligibility Criteria', 'Refund requests are treated on a case-by-case basis. A transaction may be reviewed for a potential refund only under the following verified technical circumstances:\n\nDuplicate Payments: The user was charged multiple times for the same plan due to a payment gateway lag or glitch.\n\nFailed Activation: A payment was successfully debited from the user account, but the platform failed to unlock or activate the membership benefits.\n\nPayment Errors: Any billing discrepancies explicitly confirmed by both HomeFeet systems and our third-party payment processor.'],
      ['4. Non-Refundable Situations', 'Except for the specific technical issues mentioned in Section 3, all purchases are final. Refunds will not be issued for:\n\nPartial or full usage of the paid membership access.\n\nChanges in user preference, project requirements, or budget after purchase.\n\nAny billing cycle where the user has already utilized contact unlocks, lead details, or premium communication tools.\n\nA perceived lack of suitable property matches, layout matches, or listings in the user specific geographic area of interest.'],
      ['5. Support & Dispute Resolution Process', 'If you experience a technical billing error and need to request a review, you must submit a formal request to our billing desk.\n\nHow to submit a claim: Email your request to contact@homefeet.in using your account registered email address. To expedite the verification process, you must include:\n\nYour registered phone number.\n\nThe exact transaction date and payment reference ID.\n\nThe name of the membership plan purchased.\n\nOur support team, in coordination with our payment gateway partner, will investigate the log data and respond with a resolution within 5 to 7 business days.'],
    ],
  },
};

export default function LegalPage({ type }: LegalPageProps) {
  const page = pages[type];

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [type]);

  return (
    <section className="bg-slate-50 py-16">
      <div className="ld-container">
        <div className="flex min-h-[92px] items-center justify-start bg-sky-50 px-5 py-5 text-left md:px-10">
          <h1 className="max-w-full text-left text-xl font-black leading-none tracking-tight text-slate-950 sm:text-3xl md:text-4xl">
            {page.titleLines.map((line, index) => (
              <span key={line} className={`inline whitespace-nowrap ${index === page.accentLineIndex ? 'text-[#0AA6A6]' : ''}`}>
                {index === page.titleLines.length - 1 ? `${line}..` : line}
                {index < page.titleLines.length - 1 ? ' ' : ''}
              </span>
            ))}
          </h1>
        </div>

        <div className="mx-auto mt-10 max-w-3xl">
          <p className="ld-eyebrow">{page.eyebrow}</p>
          <p className="mt-5 text-base leading-7 text-slate-600">{page.intro}</p>
          <p className="mt-3 text-sm font-semibold text-slate-500">Last updated: {page.lastUpdated}</p>
        </div>

        <div className="mx-auto mt-10 max-w-3xl space-y-5">
          {page.sections.map(([title, text]) => (
            <section key={title} className="border-b border-slate-200 pb-5">
              <h2 className="text-xl font-black text-slate-950">{title}</h2>
              <div className="mt-3 space-y-3 text-sm leading-7 text-slate-600">
                {text.split('\n\n').map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mx-auto mt-10 max-w-3xl rounded-lg bg-white p-5 text-sm leading-7 text-slate-600 shadow-sm">
          For questions about this policy, contact{' '}
          <Link to="/contact" className="font-bold text-teal-700 hover:text-teal-900">
            HomeFeet support
          </Link>
          .
        </div>
      </div>
    </section>
  );
}
