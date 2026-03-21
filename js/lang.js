const translations = {
  "Our Fleet": "Nuestra Flota",
  "Browse All": "Explorar Flota",
  "Browse All Cars": "Ver Todos",
  "Why Us": "Por Qué Nosotros",
  "Reviews": "Reseñas",
  "Contact": "Contacto",
  "Contact Us": "Contáctanos",
  "Book Now": "Reservar Ahora",
  "Available Now · Same-Day Delivery": "Disponible Ahora · Entrega en el Día",
  "Your Journey": "Tu Viaje",
  "Starts With": "Comienza Con",
  "Modern, reliable vehicles strictly curated for any occasion. A straightforward, seamless rental experience with transparent pricing and personal service.": "Vehículos modernos, confiables y estrictamente seleccionados para cualquier ocasión. Una experiencia de alquiler transparente, directa y con servicio personalizado.",
  "Browse the Fleet": "Ver la Flota",
  "How It Works": "Cómo Funciona",
  "Luxury Cars": "Autos de Lujo",
  "Happy Clients": "Clientes Felices",
  "Satisfaction": "Satisfacción",
  "Quick Reserve": "Reserva Rápida",
  "Vehicle Type": "Tipo de Vehículo",
  "Pickup Date": "Fecha de Entrega",
  "Return Date": "Fecha de Devolución",
  "Pickup Location": "Lugar de Entrega",
  "Find My Car": "Buscar Mi Auto",
  "Free cancellation · No hidden fees": "Cancelación gratis · Sin cargos ocultos",
  "Handpicked Premium": "Vehículos Premium",
  "Luxury Vehicles": "Seleccionados",
  "Each vehicle is meticulously maintained, fully insured, and available for delivery directly to your doorstep.": "Cada vehículo es mantenido meticulosamente, totalmente asegurado y está disponible para entrega directa en su puerta.",
  "View Full Fleet": "Ver Flota Completa",
  "Trust & Simplicity": "Confianza y Simplicidad",
  "The Premium Rental": "La Experiencia",
  "Experience": "Premium de Alquiler",
  "We've reimagined every step of renting a luxury vehicle — from your first search to returning the keys.": "Hemos reinventado cada paso en el alquiler de vehículos de lujo, desde tu primera búsqueda hasta la devolución de las llaves.",
  "Absolute Transparency": "Transparencia Absoluta",
  "The price you see is exactly what you pay. No hidden delivery charges or surprise fees at the counter. Just honest luxury.": "El precio que ves es exactamente lo que pagas. Sin cargos ocultos de entrega o sorpresas en el mostrador. Solo lujo honesto.",
  "Impeccable Condition": "Condición Impecable",
  "Every vehicle in our fleet is rigorously maintained to specifications and professionally detailed before every handoff. Flawless inside and out.": "Cada vehículo en nuestra flota es mantenido rigurosamente y detallado profesionalmente antes de cada entrega. Impecable por dentro y por fuera.",
  "24/7 WhatsApp Support": "Soporte 24/7 por WhatsApp",
  "Forget waiting on hold. Your personal concierge is just a message away on WhatsApp, ready to assist you instantly at any hour.": "Olvídate de esperar en línea. Tu conserje personal está a solo un mensaje de distancia en WhatsApp, listo para ayudarte al instante a cualquier hora.",
  "Flexible Delivery": "Entrega Flexible",
  "Pick up your car seamlessly from our Aventura location, or let us bring the keys directly to you at MIA or FLL airports when you land.": "Recoge tu auto sin problemas de nuestra sede en Aventura, o deja que te llevemos las llaves directamente al aeropuerto de MIA o FLL cuando aterrices.",
  "Stay in the Loop": "Mantente Informado",
  "Get Exclusive Deals &": "Obtén Ofertas Exclusivas",
  "New Arrivals First": "y Novedades Primero",
  "Join 4,800+ subscribers and be the first to hear about new vehicles, special pricing, and VIP events.": "Únete a más de 4,800 suscriptores y sé el primero en enterarte sobre nuevos vehículos, precios especiales y eventos VIP.",
  "Subscribe": "Suscribirse",
  "Premium luxury car rentals. Serving Aventura, MIA, FLL, and the greater South Florida area.": "Alquiler de vehículos de lujo premium. Sirviendo a Aventura, MIA, FLL y toda la zona del Sur de Florida.",
  "Company": "Empresa",
  "About Us": "Sobre Nosotros",
  "FAQ": "Preguntas Frecuentes",
  "Legal": "Legal",
  "Privacy Policy": "Política de Privacidad",
  "Terms & Conditions": "Términos y Condiciones",
  "Rental Agreement": "Contrato de Alquiler",
  "Consignment": "Consignación",
  "Vehicles for": "Vehículos para",
  "Every Journey": "Cada Viaje",
  "Browse our curated collection of modern, reliable automobiles ready for your next trip.": "Explora nuestra colección curada de automóviles modernos y confiables listos para tu próximo viaje.",
  "Brand:": "Marca:",
  "Category:": "Categoría:",
  "All": "Todos",
  "Sports Car": "Deportivo",
  "Luxury SUV": "SUV de Lujo",
  "Executive Sedan": "Sedán Ejecutivo",
  "Convertible": "Descapotable"
};

// Create a reverse mapping for Spanish to English (in case they toggle back and forth)
const reverseTranslations = {};
for (const [en, es] of Object.entries(translations)) {
  reverseTranslations[es] = en;
}

let currentLang = localStorage.getItem('epure_lang');
if (!currentLang) {
  const browserLang = navigator.language || navigator.userLanguage;
  if (browserLang && browserLang.toLowerCase().startsWith('es')) {
    currentLang = 'es';
  } else {
    currentLang = 'en';
  }
}

function translateTextNode(node, dict) {
  // Only process non-empty text nodes
  if (node.nodeType === 3) {
    const text = node.nodeValue.trim();
    if (text && dict[text]) {
      node.nodeValue = node.nodeValue.replace(text, dict[text]);
    }
  } else if (node.nodeType === 1) {
    // Avoid scripts and styles
    if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(node.nodeName)) return;
    // Translate placeholders in inputs/textareas
    if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA') {
        const placeholder = node.getAttribute('placeholder');
        if (placeholder && dict[placeholder]) {
            node.setAttribute('placeholder', dict[placeholder]);
        }
    }
    // Proceed to children recursively
    node.childNodes.forEach(child => translateTextNode(child, dict));
  }
}

function applyLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('epure_lang', lang);
  
  const dict = lang === 'es' ? translations : reverseTranslations;
  translateTextNode(document.body, dict);
  
  // Update toggle buttons across all menus
  document.querySelectorAll('#lang-toggle').forEach(btn => {
    btn.textContent = lang === 'en' ? 'ES' : 'EN';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  // If the stored lang is ES, apply it on load
  if (currentLang === 'es') {
    applyLanguage('es');
  }

  // Bind click event to all lang toggles (desktop and mobile could have one)
  document.querySelectorAll('#lang-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const newLang = currentLang === 'en' ? 'es' : 'en';
      applyLanguage(newLang);
    });
  });
});
