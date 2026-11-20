## Opening an Office document

A `.docx`, `.xlsx` or `.pptx` file opens in its own tab instead of being handed to the default program. The document is drawn read-only: there is no text cursor and nothing is saved back into the file. Text can still be selected and copied, and the tab behaves like any other — it can be closed, grouped and reopened.

Word documents are the ones with the most controls, because they are read the way a page is read rather than the way a document is edited.

## Reading a Word document

The preview lays the document out on pages. A page break the document saved is honoured first; where the file has none — anything written outside Word, above all — the pages are measured out after rendering, so a document that would be one long strip in a naive viewer still comes out as pages.

The pages are drawn as one continuous column, so reading is one scroll from top to bottom. A page indicator in the bottom-left corner shows where you are (`3 / 12`), updated as you scroll, and the page count is the pages this preview laid out rather than a field stored in the file.

## The view controls

The round button in the bottom-right corner opens the display options:

- **Zoom** — the minus and plus buttons step the size, and a percentage can be typed (25–400). *Fit width* returns to the measured size, which is the default and follows the pane as it narrows or widens.
- **Hide page gaps** — on by default. The space between pages, and the header and footer inside it, are removed, so pages meet with no break in the run of text; turn it off to see each sheet whole, margins and headers included.
- **Paper** — white, cream, eye-care green, or a colour from the system picker. The choice is remembered and applies to every Word document.

The options close when you click the button again, click anywhere else, or press `Esc`, and each document opens with its own zoom and paper.

## What the preview does not do

The layout is the renderer's, not Word's: fonts the document asks for but the system does not have are substituted, and a table taller than a page is kept whole rather than split across two. Page numbers can therefore differ from Word's by a page here and there, and a document that relies on precise pagination is better read in Word itself.
