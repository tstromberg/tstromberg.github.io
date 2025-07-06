---
title: "DIY Electric Jerry Can"
date: 2023-05-12
---
In the 1930s, Vinzenz Grünvogel designed the _Wehrmacht-Einheitskanister_: an ingenious container that was stackable, carried liquid without spilling and was easy to carry. The design was so popular that nations around the world copied it, and in the United States, it became known as a “Jerry Can” (Jerry being slang for “German”).

This project shares none of those attributes.

![](https://i.snap.as/rvh9B0ox.jpg)

<!--more-->

### The Range Anxiety Problem


Before I bought the[ BMW CE-04](https://www.bmwmotorcycles.com/en/models/urban_mobility/ce04.html) — an insanely fun electric scooter, I knew there would be range issues. With a relatively small 8.2kWh battery, the range varies highly depending on the speed of the road you are traveling on:

* 35mph (55km/h) → 75 miles (120 km) of range
* 55mph (90km/h) → 60 miles (95 km) of range
* 75mph (120km/h) → 40 miles (65 km) of range

![](https://i.snap.as/CTLEu5Y1.jpg)

Unlike larger EVs, this scooter does not give you a range estimate for a destination or direct you to EV chargers when running low. If you are going to use a short-range EV for long-distance trips, you will need to plan ahead using tools like[ ABetterRoutePlanner](https://abetterrouteplanner.com/) and PlugShare.

Even with proper planning, you can find yourself in a situation where you consume more charge than you’ve planned: for example, by speeding or taking a wrong turn onto a 70 mph highway.

### The rough plan

Long-distance “Adventure” motorcyclists often pack a[ small fuel canister for emergencies](https://twistedthrottle.com/shop/luggage/fuel-bottles-and-mounts/msr-30oz-fuel-bottle/). Jeep drivers often bring full-sized Jerry Cans. Why not do the same for EVs?

It’s easy enough to find large power banks: Jackery, Anker, EcoFlow, and Goal-Zero will all happily sell you one. The challenge was finding a power bank that stored enough charge to be helpful (800 - 1200 kWh) and could fit in the helmet compartment of the CE-04. After taking measurements, I was confident that the[ Jackery 1000](https://www.jackery.com/products/explorer-1000-portable-power-station) might just work, so I waited for it to go on sale.

### Early experiments were full of fail

![](https://i.snap.as/2lkNRGdu.jpg)

My first experiments went poorly: both the BMW (Delphi) EV charger and the Tesla Mobile Connector refused to charge from the Jackery 1000 due to the lack of proper ground. I soon learned that the[ SAE J1772](https://en.wikipedia.org/wiki/SAE_J1772) EV charger specifications required ground monitoring for safety reasons.

The Jackery 1000 and most other power banks don’t offer a user-accessible ground: the 3rd pin on their sockets is just an empty slot so that a standard 3-prong power cable fits.

### Overcoming the J1772 Grounding Requirement

I tried a number of workarounds, but none of them fooled the EVSE (a fancy acronym for an EV charger cable):

* 3-pin to 2-pin converters
* Portable GFCI outlets
* Neutral-Ground Bonding Plugs

I found a Youtube video demonstrating one method to circumvent ground detection, but it seemed overly hacky, bulky, and potentially dangerous. I also contacted the[ EVDOCTOR](https://evdoctor4earth1.weebly.com/) for advice, who recommended that if I opened the Jackery, I’d likely find a metal ground internal.

I had read about some of the cheaper EVSE cables not implementing ground, and the EVDOCTOR hinted that the easiest path forward would be ordering the cheapest EVSE I could and returning it if it implemented ground.

There is no comprehensive list of EVSE cables that can be used without a ground, but I did find hints suggesting that these may work:

* [Southking SK-EV16](https://www.mynissanleaf.com/viewtopic.php?t=31649)
* Toyota Prius PHEV cable
* Honda Clarity PHEV cable

![](https://i.snap.as/Mcm4YXHJ.jpg)

I looked at the cheapest EVSE cables on Amazon and found one that seemed perfect: a 13ft “travel” cord that supported 220V/110V and allowed ground monitoring to be toggled:[ Sankaba Level 2 EV Charger,16Amp EV Charger Station,NEMA 5-20 Plug EV Charger Level 2,100-240v Portable EV Charger](https://www.amazon.com/dp/B0BBPNGPML?psc=1&ref=ppx_yo2ov_dt_b_product_details)

Notably, the ad mentions that there is a “Ground Setting” available:

> After entering the menu, there are two options.

> The device can detect whether the input power supply of the product connected ground wire. If the user's power input is not equipped with ground wire, the device cannot work normally. You should select the second option to connect it.

> For security, it will be ensured that the power input is protected by a ground wire.

I bought the Sankaba, and it works just fine with the Jackery 1000 out of the box. The OEM appears to be "Ningbo Yiwei New Energy Technology Co., LTD" with a model number of EV-SAE-AC16-P. This EVSE is also sold under the name of Sunsky.

### Modding the Jackery case

I expected the Jackery 1000 would be barely too tall to fit in the helmet compartment on the CE-04, but I was confident I could remove the top handle if it became a problem. When I received the unit, I learned I was right:

![](https://i.snap.as/zvB63J21.jpg)

I found a[ teardown video](https://www.youtube.com/watch?v=AKxt4eAwKRU&t=238s) for the Jackery and was happy to see that the handle was empty plastic, so I took a hacksaw to it:

![](https://i.snap.as/MHp8Ob11.jpg)

With that, the Jackery fits just barely in the helmet compartment. I sanded down the leftover corners of the handle to improve clearance and even added a carrying strap.

![](https://i.snap.as/yhAfzJdd.jpg)

### The finished product

![](https://i.snap.as/ngBwOroN.jpg)

Once assembled, using the Jackery Electric JerryCan is easy:

* On the BMW CE-04, set the maximum amperage to 10A
* Place the charging brick in the shade to prevent overheating
* Hit the “AC” button on the Jackery 1000
* Plug the charging cable in on both ends

It takes about 45 minutes to fully discharge the Jackery’s battery fully over 110V, adding 750Wh - or about 9.3% charge to the BMW CE-04. Due to the inefficiency of DC->AC->DC conversion, you will not get the full 1002Wh. The charge is good enough for emergency use, as it’s enough for this scooter to make it 6 miles (10 km) further to a real charger.

As the auxiliary battery takes up nearly the entire helmet compartment, I store the EVSE cable in my top case with other emergency tools:

![](https://i.snap.as/mCH3LZOR.jpg)

### Bill of Materials

* Jackery 1000 (1002Wh portable battery): $827
* Shoulder Dolly HandyLifter Carrying Strap: $13
* 6-20P to 5-15 adapter: $8
* Sankaba/Sunsky EVSE L2 Charger (no grounding requirements): $96

### Questions I’ve received

* Why not place the battery in the top case? It’s too heavy: the top case on the CE-04 is only rated to carry 5kg (11 lbs).
* Can you charge the Jackery 1000 up at an EV charger? Probably with the right adapters, but you wouldn’t want to, as it takes 8 hours to recharge. The newer 1000 Pro charges in 1.8 hours.
* Is there a 220V option? Yes! I could not find any in the US, but you can buy 220V portable power stations in Europe. They will even charge the CE-04 charge twice as fast!

If you have any questions, find me on[ Mastodon](https://triangletoot.party/@thomrstrom) or e-mail me at t<AT>stromberg.org.