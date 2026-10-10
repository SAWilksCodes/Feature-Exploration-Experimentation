# Privacy contract

Files in `current/` are read by the Case & Quote Desk dashboard through the Microsoft 365 connector in Claude. Each viewer's own SharePoint access applies. No model reads the rows unless someone asks Claude to look at the data.

Until the agency decides otherwise, exports follow these rules:

- **No names, addresses, dates of birth, VINs, or policy numbers.** A case is identified only by `case_id`.
- `client` holds a label such as `Case 0142`, never the person's name.
- The dashboard needs nothing more than that. The client's name stays in Case Desk on the PC.
