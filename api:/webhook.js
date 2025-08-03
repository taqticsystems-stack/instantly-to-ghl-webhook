
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const event = req.body.event;
  const contactData = req.body.contact || req.body.lead || req.body;
  const tag = mapTag(event);
  const stageId = mapStage(event);

  if (!contactData?.email) return res.status(400).send('Missing email');

  const GHL_API_KEY = process.env.GHL_API_KEY;
  const LOCATION_ID = process.env.GHL_LOCATION_ID;
  const PIPELINE_ID = process.env.PIPELINE_ID;

  try {
    const contactRes = await fetch(`https://rest.gohighlevel.com/v1/contacts/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GHL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: contactData.email,
        firstName: contactData.first_name || 'Lead',
        phone: contactData.phone || '',
        locationId: LOCATION_ID,
        tags: [tag]
      })
    });
    const contact = await contactRes.json();

    await fetch(`https://rest.gohighlevel.com/v1/opportunities/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GHL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contactId: contact.id,
        locationId: LOCATION_ID,
        pipelineId: PIPELINE_ID,
        stageId: stageId || '',
        status: 'open',
        name: contactData.email,
        tags: [tag]
      })
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).send('Error syncing with GHL');
  }

  function mapTag(event) {
    switch (event) {
      case 'email_sent': return 'email1_sent';
      case 'email_opened': return 'email1_opened';
      case 'email_replied': return 'reply_received';
      default: return 'untracked_event';
    }
  }

  function mapStage(event) {
    switch (event) {
      case 'email_sent': return '650b7c87-8471-49cb-a22e-180bf498b03d';
      case 'email_replied': return 'e47319bc-0b3e-44cd-a1f1-00cf10f863b2';
      default: return null;
    }
  }
}
