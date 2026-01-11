import React from 'react';

const PlaceholderPage = ({ title }) => (
    <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] text-center">
        <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">{title}</h1>
        <p className="text-neutral-500">Feature coming soon...</p>
    </div>
);

export const Economy = () => <PlaceholderPage title="Love Economy" />;
export const Games = () => <PlaceholderPage title="Games & Fun" />;
export const RedRoom = () => <PlaceholderPage title="Red Room 18+" />;
export const Organizer = () => <PlaceholderPage title="Family Organizer" />;
