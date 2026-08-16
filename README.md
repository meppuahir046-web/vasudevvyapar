# Retail Buddy Pro

Build a complete production-ready bilingual Retail Inventory & Business Management Web Application.

IMPORTANT:

This is NOT a static UI demo. Build a fully functional application with a real database, authentication, business logic, inventory calculations, customer management, sales, payments, invoices, PDF generation, WhatsApp sharing, Excel exports, reports and bilingual Gujarati/English support.

The application will be used by a retail shop owner who sells many products to different customers. Different customers may have different selling prices for the same product.

==================================================

1. TECHNOLOGY

==================================================

Use:

- React / Next.js

- TypeScript

- Tailwind CSS

- shadcn/ui

- Supabase PostgreSQL

- Supabase Authentication

- Proper relational database

- Row Level Security

- PDF invoice generation

- XLSX Excel export

- Responsive mobile-first design

Use INR (₹) as default currency.

Use proper NUMERIC/DECIMAL database types for money.

Never use hardcoded financial calculations.

All important calculations must come from the database/business logic.

==================================================

2. BILINGUAL LANGUAGE SYSTEM

==================================================

This is a VERY IMPORTANT feature.

The entire application must support:

1. English

2. ગુજરાતી (Gujarati)

Add a language switcher in the header/profile/settings.

Example:

English | ગુજરાતી

When the user selects Gujarati:

ALL user-facing UI text must change to Gujarati.

When the user selects English:

ALL user-facing UI text must change to English.

Translate:

- Dashboard

- Navigation

- Buttons

- Forms

- Tables

- Filters

- Product pages

- Customer pages

- Sales

- Payments

- Reports

- Invoice

- Settings

- Error messages

- Validation messages

- Empty states

- Notifications

- Confirmation dialogs

- PDF invoice labels

- Excel report headings where possible

Do NOT translate:

- Product names entered by the business owner

- Customer names

- Addresses

- Business-specific data

- Invoice numbers

- SKU codes

Create a proper i18n translation system instead of hardcoding translated text inside components.

Example translation structure:

dashboard.title

dashboard.totalSales

dashboard.totalProfit

dashboard.totalStock

customers.title

customers.search

sales.newSale

sales.total

payments.pending

reports.monthlyReport

settings.language

Gujarati examples:

Dashboard = ડેશબોર્ડ

Products = પ્રોડક્ટ્સ

Inventory = સ્ટોક

Customers = ગ્રાહકો

New Sale = નવું વેચાણ

Sales = વેચાણ

Payments = ચુકવણી

Reports = રિપોર્ટ

Total Stock = કુલ સ્ટોક

Total Investment = કુલ રોકાણ

Total Sales = કુલ વેચાણ

Total Profit = કુલ નફો

Pending Amount = બાકી રકમ

Search Customer = ગ્રાહક શોધો

Save = સાચવો

Cancel = રદ કરો

The UI should allow switching language instantly without reloading the page.

Save the user's selected language preference.

Default language should be English.

==================================================

3. AUTHENTICATION

==================================================

Create secure login system.

Features:

- Login

- Logout

- Forgot password

- Protected routes

- Session persistence

Initially design it for one business owner.

Do not allow unauthenticated users to access business data.

==================================================

4. MAIN NAVIGATION

==================================================

Create:

Dashboard

Products

Inventory

Customers

New Sale

Sales

Payments

Invoices

Reports

Settings

On mobile use a bottom navigation or mobile-friendly navigation drawer.

==================================================

5. DASHBOARD

==================================================

Create a premium business dashboard.

Show:

- Total Products

- Total Customers

- Current Stock

- Total Stock Investment

- Current Stock Value

- Total Sales

- Total Amount Received

- Total Pending

- Total Profit

- Low Stock Products

Also show:

Today's Sales

Today's Profit

This Month Sales

This Month Profit

Charts:

- Monthly Sales

- Monthly Profit

- Product-wise Sales

- Top Customers

- Pending Payments

Allow date range filtering.

==================================================

6. PRODUCT MANAGEMENT

==================================================

Create Products module.

Fields:

- Product ID

- Product Name

- SKU

- Category

- Brand

- Unit

- Minimum Stock Level

- Description

- Active/Inactive

- Created At

- Updated At

Supported units:

KG

Gram

Liter

ML

Piece

Box

Packet

Bottle

Dozen

Other

Allow decimal quantities.

Example:

25.5 KG

Product features:

- Add

- Edit

- View

- Search

- Filter

- Deactivate

- Stock history

- Purchase history

- Sales history

- Profit history

==================================================

7. STOCK PURCHASE

==================================================

Create Stock In / Purchase system.

When owner purchases stock, store:

- Product

- Purchase Date

- Supplier

- Quantity

- Unit

- Total Purchase Amount

- Cost Per Unit

- Invoice Number

- Notes

Automatically calculate:

Cost Per Unit =

Total Purchase Amount / Quantity

Example:

50 KG Haldi

Purchase Amount = ₹5,000

Cost = ₹100/KG

The system must increase stock automatically.

Never overwrite previous purchase history.

==================================================

8. INVENTORY

==================================================

Create a complete inventory system.

For every product show:

- Total Purchased

- Total Sold

- Current Available Stock

- Total Investment

- Current Stock Cost Value

- Average Purchase Cost

- Total Sales

- Total Profit

- Last Purchase

- Last Sale

Formula:

Current Stock =

Total Stock In - Total Stock Sold + Returns - Adjustments

Use weighted average cost for inventory costing unless a more suitable method is explicitly required.

Maintain an inventory transaction ledger.

Transaction types:

PURCHASE

SALE

SALE_RETURN

PURCHASE_RETURN

ADJUSTMENT

CANCELLATION

==================================================

9. STOCK INVESTMENT

==================================================

Show clearly:

Total money invested in current inventory.

Example:

Haldi:

Current Stock = 25 KG

Average Cost = ₹100/KG

Current Investment = ₹2,500

Products page should show product-wise investment.

Dashboard should show:

TOTAL CURRENT STOCK INVESTMENT = ₹XXXXX

==================================================

10. CUSTOMER MANAGEMENT

==================================================

Create Customers module.

Fields:

- Customer Name

- Mobile Number

- WhatsApp Number

- Address

- City

- Notes

- Created Date

Features:

- Add Customer

- Edit Customer

- Deactivate Customer

- Search Customer

- Search by Name

- Search by Mobile

- View Customer

- Customer Purchase History

- Payment History

- Pending Balance

Customer search must work instantly.

Example:

Search:

"Rahul"

Show all customers containing Rahul.

==================================================

11. CUSTOMER PROFILE

==================================================

When clicking a customer, open a detailed customer profile.

Show:

Customer Name

Mobile

WhatsApp

Address

Summary:

Total Orders

Total Purchased

Total Paid

Total Pending

Total Profit

Show complete purchase history.

Example:

Date | Invoice | Product | Quantity | Rate | Total | Paid | Pending

01/08/2026

Haldi

25 KG

₹140/KG

₹3,500

Paid ₹2,000

Pending ₹1,500

The customer should be able to see:

- How many times they purchased during a selected year

- What products they purchased

- Total quantity of every product purchased

- Total money spent

- Total paid

- Total pending

- Purchase dates

- Invoice history

Add filters:

- This Year

- This Month

- Custom Date Range

- Product

- Payment Status

==================================================

12. CUSTOMER-SPECIFIC PRODUCT PRICING

==================================================

This is one of the most important features.

Every customer can have a different selling price for every product.

Example:

Customer A:

Haldi = ₹140/KG

Sugar = ₹45/KG

Oil = ₹150/L

Customer B:

Haldi = ₹135/KG

Sugar = ₹47/KG

Oil = ₹148/L

Create:

customer_product_prices

Fields:

- Customer

- Product

- Selling Price

- Unit

- Effective Date

- Updated At

Customer profile should have:

"Product Prices"

When opened, show ALL available products.

Example:

Product | Default Price | Customer Price

Haldi | ₹130 | ₹140

Sugar | ₹50 | ₹45

Oil | ₹155 | ₹150

The owner can enter a different price for each product.

When creating a sale:

1. Select customer

2. Select product

3. Automatically load that customer's price

4. Allow manual override

5. Save/update customer-specific price if required

==================================================

13. NEW SALE

==================================================

Create a very easy New Sale screen.

Workflow:

Select Customer

Then add products.

For every product:

Product

Available Stock

Quantity

Unit

Customer Price

Total

Allow adding unlimited products to one invoice.

Example:

Customer:

Rahul Patel

Products:

Haldi

25 KG

₹140/KG

₹3,500

Sugar

10 KG

₹45/KG

₹450

Oil

5 Liter

₹150/L

₹750

Subtotal

Discount

Grand Total

Paid Amount

Pending Amount

Payment Status

Save Sale.

==================================================

14. STOCK VALIDATION

==================================================

Never allow selling more stock than available.

Example:

Available:

20 KG

Customer requests:

25 KG

Show:

"Insufficient stock"

Gujarati:

"પૂરતો સ્ટોક ઉપલબ્ધ નથી"

Do not save the sale until corrected.

==================================================

15. PROFIT CALCULATION

==================================================

Automatically calculate product-wise and invoice-wise profit.

Example:

Purchase:

50 KG Haldi

Cost = ₹5,000

Cost per KG = ₹100

Sale:

25 KG

Selling price = ₹140/KG

Revenue = ₹3,500

Cost = ₹2,500

Profit = ₹1,000

Remaining stock:

25 KG

Remaining stock cost = ₹2,500

Show:

Revenue

Cost

Profit

Profit Margin %

Formula:

Profit =

Selling Revenue - Cost Of Goods Sold

Profit Margin =

Profit / Selling Revenue × 100

Show profit:

- Per product

- Per sale

- Per customer

- Per day

- Per month

- Custom date range

- Overall

==================================================

16. PENDING STOCK / CUSTOMER DUES

==================================================

Clearly distinguish two different meanings of pending:

A. CUSTOMER PAYMENT PENDING

Example:

Bill = ₹3,500

Paid = ₹2,000

Pending = ₹1,500

B. REMAINING PRODUCT STOCK

Purchased:

50 KG

Sold:

25 KG

Remaining:

25 KG

Show both separately.

Customer profile:

Total Purchased

Total Paid

Total Amount Pending

Product-wise:

Total Purchased Quantity

Total Sold Quantity

Remaining Quantity

==================================================

17. PAYMENT MANAGEMENT

==================================================

Create Payments module.

Payment fields:

Customer

Invoice

Date

Amount

Payment Method

Reference

Notes

Methods:

Cash

UPI

Bank Transfer

Card

Other

Allow partial payments.

Example:

Invoice:

₹10,000

Payment 1:

₹3,000

Payment 2:

₹2,000

Remaining:

₹5,000

Maintain complete payment history.

==================================================

18. INVOICE / BILL

==================================================

Generate professional PDF invoices.

Invoice should contain:

Business Logo

Business Name

Address

Phone

WhatsApp

GST Number if available

Invoice Number

Invoice Date

Customer Name

Mobile

Address

Product

Quantity

Unit

Rate

Amount

Subtotal

Discount

Grand Total

Paid

Pending

Payment Status

Notes

Thank You Message

Allow:

Preview

Download PDF

Print

Share

==================================================

19. WHATSAPP PDF SHARING

==================================================

Add:

"Share on WhatsApp"

button.

When clicked:

- Generate invoice PDF

- Prepare WhatsApp message

- Open WhatsApp using customer's WhatsApp/mobile number when supported

- Include invoice number

- Total amount

- Paid amount

- Pending amount

On supported mobile browsers provide native share functionality so the user can share the generated PDF directly.

If direct WhatsApp PDF attachment is not supported by the browser/device, provide:

Download PDF

+

Share PDF using device share sheet.

Do not pretend that browser APIs can directly attach files to WhatsApp in every environment.

==================================================

20. SALES HISTORY

==================================================

Create Sales page.

Columns:

Invoice

Date

Customer

Items

Total

Paid

Pending

Profit

Status

Filters:

Customer

Product

Date

Payment Status

Search:

Invoice Number

Customer Name

Mobile

Actions:

View

Invoice

Download PDF

Share

Record Payment

Cancel Sale

When cancelling a sale:

- Restore stock

- Reverse inventory transaction

- Correct profit

- Correct customer balance

- Preserve transaction history

Do not permanently delete financial records without proper reversal.

==================================================

21. MONTHLY REPORT

==================================================

Create Reports module.

User can select:

January 2026

February 2026

...

Any month

Any year

Show:

STOCK IN

Total Stock Purchased

Total Purchase Investment

STOCK OUT

Total Stock Sold

Total Sales Revenue

CURRENT STOCK

Available Stock

Current Stock Value

PROFIT

Total Revenue

Total Cost

Total Profit

Profit Margin

PAYMENTS

Total Received

Total Pending

CUSTOMERS

Total Customers

New Customers

Customers Who Purchased During Month

PRODUCTS

Product-wise:

Purchased Quantity

Sold Quantity

Available Quantity

Investment

Revenue

Profit

CUSTOMERS

Customer-wise:

Customer Name

Orders

Products Purchased

Total Quantity

Total Amount

Paid

Pending

==================================================

22. CUSTOM DATE RANGE

==================================================

Allow:

Today

Yesterday

This Week

This Month

Last Month

This Year

Custom Date Range

Example:

01/01/2026 → 30/11/2026

Generate complete report.

==================================================

23. EXCEL EXPORT

==================================================

Create powerful Excel export.

Buttons:

Export This Month

Export Selected Month

Export Custom Date Range

Export 11 Months

Export Full History

Allow:

Start Month

End Month

Example:

January 2026 → November 2026

Generate ONE Excel workbook.

Workbook sheets:

1. Overall Summary

2. Products

3. Stock In

4. Stock Sold

5. Current Inventory

6. Customers

7. Customer Purchases

8. Sales

9. Sale Items

10. Payments

11. Profit & Loss

12. Monthly Summary

==================================================

24. EXCEL OVERALL SUMMARY

==================================================

Summary should include:

Date Range

Total Purchase Investment

Total Stock Purchased

Total Stock Sold

Current Stock

Current Stock Value

Total Sales

Total Received

Total Pending

Total Profit

Total Customers

Total Orders

Monthly Summary:

Month

Stock Purchased

Purchase Investment

Stock Sold

Sales

Received

Pending

Profit

Customers

==================================================

25. EXCEL CUSTOMER REPORT

==================================================

For selected month/date range:

Customer Name

Mobile

Number of Orders

Products Purchased

Total Quantity

Total Amount

Paid

Pending

Also create customer-wise detailed sheet:

Date

Customer

Invoice

Product

Quantity

Rate

Amount

Paid

Pending

==================================================

26. EXCEL PRODUCT REPORT

==================================================

Product:

Product Name

Total Purchased

Purchase Investment

Total Sold

Sales Revenue

Current Stock

Current Stock Investment

Profit

==================================================

27. LOW STOCK ALERT

==================================================

Every product has Minimum Stock Level.

Example:

Haldi:

Minimum = 10 KG

Current = 7 KG

Show:

Low Stock

Dashboard alert:

"7 products are low in stock"

Gujarati:

"7 પ્રોડક્ટનો સ્ટોક ઓછો છે"

==================================================

28. GLOBAL SEARCH

==================================================

Add search functionality.

Search:

Customers

Products

Invoices

Customer search by:

Name

Mobile

Product search by:

Product Name

SKU

Category

==================================================

29. DATABASE TABLES

==================================================

Create proper relational database tables.

Suggested:

profiles

business_settings

categories

products

customers

customer_product_prices

suppliers

stock_purchases

stock_purchase_items

inventory_transactions

sales

sale_items

payments

invoices

returns

audit_logs

Relationships:

customers → sales

sales → sale_items

sales → payments

products → sale_items

products → stock_purchase_items

customers → customer_product_prices

products → customer_product_prices

products → inventory_transactions

customers → payments

Use foreign keys.

Add indexes for:

customer name

mobile

product name

SKU

invoice number

transaction date

==================================================

30. INVENTORY LEDGER

==================================================

Every inventory movement must create an inventory transaction.

Types:

PURCHASE

SALE

SALE_RETURN

PURCHASE_RETURN

ADJUSTMENT

CANCELLATION

Store:

Product

Transaction Type

Quantity

Unit Cost

Reference

Date

Notes

Inventory must be calculated from the transaction history.

==================================================

31. RETURNS

==================================================

Support sales returns.

Workflow:

Select Invoice

Select Product

Enter Return Quantity

System:

- Increase stock

- Reverse appropriate revenue

- Reverse appropriate cost/profit

- Adjust customer balance

- Create return transaction

==================================================

32. BUSINESS SETTINGS

==================================================

Create Settings page.

Fields:

Business Name

Logo

Owner Name

Address

Phone

WhatsApp

Email

GST Number

Invoice Prefix

Currency

Invoice Footer

Language:

English

ગુજરાતી

Theme:

Light

Dark

Save settings.

Business details should appear automatically on invoices and reports.

==================================================

33. MOBILE-FIRST DESIGN

==================================================

The app will frequently be used from a mobile phone.

Make it extremely mobile friendly.

Mobile:

- Bottom navigation

- Large buttons

- Touch-friendly controls

- Responsive tables

- Product cards

- Customer cards

- Sticky New Sale button

- Easy search

- Easy quantity input

- Easy payment input

- Easy invoice sharing

Desktop:

- Sidebar

- Dashboard cards

- Tables

- Charts

- Advanced filters

==================================================

34. UI DESIGN

==================================================

Create a premium professional retail management UI.

Use:

- Clean cards

- Modern tables

- Clear typography

- Good spacing

- Professional icons

- Green for profit

- Red for loss/pending/alerts

- Blue for primary actions

- Neutral backgrounds

Avoid excessive animations.

Focus on speed and usability.

==================================================

35. LANGUAGE UX

==================================================

Language selector should be visible.

Example:

🌐 English

🌐 ગુજરાતી

If Gujarati selected:

Navigation becomes:

ડેશબોર્ડ

પ્રોડક્ટ્સ

સ્ટોક

ગ્રાહકો

નવું વેચાણ

વેચાણ

ચુકવણી

ઇન્વૉઇસ

રિપોર્ટ

સેટિંગ્સ

Buttons:

Add Product = પ્રોડક્ટ ઉમેરો

Add Customer = ગ્રાહક ઉમેરો

New Sale = નવું વેચાણ

Save = સાચવો

Cancel = રદ કરો

Search = શોધો

Download = ડાઉનલોડ

Share = શેર કરો

Edit = ફેરફાર કરો

Delete = કાઢી નાખો

The translation system must cover the entire app, not only the dashboard.

==================================================

36. FINANCIAL SAFETY

==================================================

Use database transactions for:

Sale creation

Stock deduction

Payment creation

Sale cancellation

Returns

Prevent:

Negative stock

Negative quantity

Negative price

Invalid payments

Payment greater than outstanding amount

Duplicate invoice numbers

All important totals must be recalculated from transaction data.

==================================================

37. DEMO DATA

==================================================

Create optional demo/test data.

Product:

Haldi

Purchase:

50 KG

₹5,000

Cost:

₹100/KG

Customer:

Test Customer

Sale:

25 KG

₹140/KG

Revenue:

₹3,500

Cost:

₹2,500

Profit:

₹1,000

Paid:

₹2,000

Pending:

₹1,500

Remaining Stock:

25 KG

Mark demo data clearly and allow deleting/resetting demo data.

==================================================

38. TESTING

==================================================

Verify these scenarios:

1. Purchase stock.

2. Stock increases.

3. Sell product.

4. Stock decreases.

5. Selling price is customer-specific.

6. Profit is calculated correctly.

7. Partial payment works.

8. Pending amount works.

9. Customer history works.

10. Product history works.

11. Monthly report works.

12. 11-month report works.

13. Excel export works.

14. PDF invoice works.

15. WhatsApp sharing works where supported.

16. Gujarati translation works.

17. English translation works.

18. Language preference persists.

19. Sale cancellation restores stock.

20. Return correctly adjusts inventory and financial values.

==================================================

39. IMPORTANT FINAL REQUIREMENT

==================================================

Build the application in a scalable and production-ready way.

Do not create placeholder buttons.

Do not leave fake calculations.

Do not use static dashboard numbers.

Every page must connect to the database.

Every sale must update inventory.

Every payment must update outstanding balance.

Every report must use real transaction data.

Every Excel export must match the application data.

Every invoice must contain real customer and sale information.

The owner should be able to operate the complete retail business from this application.

Prioritize:

1. Accuracy

2. Easy retail usage

3. Mobile usability

4. Gujarati accessibility

5. Fast customer search

6. Correct inventory

7. Correct profit/loss

8. Correct pending payments

9. Reliable PDF invoices

10. Reliable Excel reporting

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://vasudevvyapar.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/33e7cfac-812d-40ee-88d1-bc7bc28c6375).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
