import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.post('/', async (req: Request, res: Response) => {
  const { email, phoneNumber } = req.body;
  if (!email && !phoneNumber) {
    return res.status(400).json({ error: 'At least one of email or phoneNumber is required.' });
  }

  // Find all contacts matching email or phoneNumber
  const contacts = await prisma.contact.findMany({
    where: {
      OR: [
        email ? { email } : undefined,
        phoneNumber ? { phoneNumber } : undefined,
      ].filter(Boolean) as any,
    },
    orderBy: { createdAt: 'asc' },
  });

  // Helper to get all linked contacts (transitive closure)
  async function getAllLinkedContacts(startContacts: typeof contacts) {
    const seen = new Set<number>();
    let toVisit = [...startContacts];
    let all: typeof contacts = [];
    while (toVisit.length) {
      const current = toVisit.pop();
      if (!current || seen.has(current.id)) continue;
      seen.add(current.id);
      all.push(current);
      // Find all contacts linked to this one (by linkedId or id)
      const linked = await prisma.contact.findMany({
        where: {
          OR: [
            { linkedId: current.id },
            { id: current.linkedId ?? -1 },
          ],
        },
      });
      toVisit.push(...linked);
    }
    return all;
  }

  let allLinkedContacts = contacts.length ? await getAllLinkedContacts(contacts) : [];
  // Find the primary contact (oldest, linkPrecedence: 'primary', or lowest id)
  let primaryContact = allLinkedContacts.find(c => c.linkPrecedence === 'primary')
    || allLinkedContacts.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];

  // If no contacts found, create a new primary
  if (!primaryContact) {
    const newContact = await prisma.contact.create({
      data: {
        email,
        phoneNumber,
        linkPrecedence: 'primary',
      },
    });
    return res.json({
      contact: {
        primaryContatctId: newContact.id,
        emails: [newContact.email].filter(Boolean),
        phoneNumbers: [newContact.phoneNumber].filter(Boolean),
        secondaryContactIds: [],
      },
    });
  }

  // If both email and phoneNumber are present and not in any linked contact, create a new secondary
  const emails = Array.from(new Set([
    ...(primaryContact.email ? [primaryContact.email] : []),
    ...allLinkedContacts.filter(c => c.email).map(c => c.email!),
    ...(email && !allLinkedContacts.some(c => c.email === email) ? [email] : []),
  ]));
  const phoneNumbers = Array.from(new Set([
    ...(primaryContact.phoneNumber ? [primaryContact.phoneNumber] : []),
    ...allLinkedContacts.filter(c => c.phoneNumber).map(c => c.phoneNumber!),
    ...(phoneNumber && !allLinkedContacts.some(c => c.phoneNumber === phoneNumber) ? [phoneNumber] : []),
  ]));

  let newSecondaryContact = null;
  if (
    (email && !allLinkedContacts.some(c => c.email === email)) ||
    (phoneNumber && !allLinkedContacts.some(c => c.phoneNumber === phoneNumber))
  ) {
    newSecondaryContact = await prisma.contact.create({
      data: {
        email,
        phoneNumber,
        linkPrecedence: 'secondary',
        linkedId: primaryContact.id,
      },
    });
    allLinkedContacts.push(newSecondaryContact);
  }

  // Merge logic: if multiple primaries, re-link all to the oldest
  const primaries = allLinkedContacts.filter(c => c.linkPrecedence === 'primary');
  if (primaries.length > 1) {
    const oldest = primaries.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
    const toUpdate = primaries.filter(p => p.id !== oldest.id);
    await Promise.all(toUpdate.map(p =>
      prisma.contact.update({
        where: { id: p.id },
        data: {
          linkPrecedence: 'secondary',
          linkedId: oldest.id,
        },
      })
    ));
    primaryContact = oldest;
  }

  // Re-fetch all linked contacts after possible merge
  allLinkedContacts = await getAllLinkedContacts([primaryContact]);

  // Prepare response
  const secondaryContactIds = allLinkedContacts
    .filter(c => c.linkPrecedence === 'secondary')
    .map(c => c.id);

  // Ensure primary's email/phone are first in the arrays
  const emailsOrdered = [primaryContact.email, ...emails.filter(e => e && e !== primaryContact.email)]
    .filter(Boolean);
  const phoneNumbersOrdered = [primaryContact.phoneNumber, ...phoneNumbers.filter(p => p && p !== primaryContact.phoneNumber)]
    .filter(Boolean);

  res.json({
    contact: {
      primaryContatctId: primaryContact.id,
      emails: emailsOrdered,
      phoneNumbers: phoneNumbersOrdered,
      secondaryContactIds,
    },
  });
});

export default router; 